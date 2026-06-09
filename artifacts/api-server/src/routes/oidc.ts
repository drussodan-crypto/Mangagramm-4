import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";
const OIDC_COOKIE_TTL = 10 * 60 * 1000;

let oidcConfig: oidc.Configuration | null = null;

async function getOidcConfig(): Promise<oidc.Configuration> {
  if (!oidcConfig) {
    oidcConfig = await oidc.discovery(new URL(ISSUER_URL), process.env.REPL_ID!);
  }
  return oidcConfig;
}

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

async function upsertReplitUser(claims: Record<string, unknown>) {
  const replitId = claims.sub as string;
  const email = (claims.email as string) || null;
  const firstName = (claims.first_name as string) || null;
  const lastName = (claims.last_name as string) || null;
  const avatar = ((claims.profile_image_url || claims.picture) as string) || null;
  const displayName = firstName ? [firstName, lastName].filter(Boolean).join(" ") : null;

  const existing = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.replitId, replitId), ...(email ? [eq(usersTable.email, email)] : [])));

  const CERTIFIED_EMAILS = ["drussodan@gmail.com", "mangagramm@gmail.com"];
  const isAutoVerified = email ? CERTIFIED_EMAILS.includes(email) : false;

  if (existing.length > 0) {
    const user = existing[0];
    const updateSet: any = {
      replitId,
      avatar: avatar || user.avatar,
      displayName: displayName || user.displayName,
    };
    if (isAutoVerified) {
      updateSet.verified = true;
      updateSet.role = "author";
    }
    const [updated] = await db
      .update(usersTable)
      .set(updateSet)
      .where(eq(usersTable.id, user.id))
      .returning();
    return updated;
  }

  const baseUsername = (claims.username as string) || (firstName ? firstName.toLowerCase() : "user");
  const uniqueUsername = `${baseUsername}_${replitId.slice(-6)}`;

  const [newUser] = await db
    .insert(usersTable)
    .values({
      replitId,
      email: email || `${replitId}@replit.user`,
      username: uniqueUsername,
      displayName: displayName || uniqueUsername,
      avatar: avatar || null,
      role: isAutoVerified ? "author" : "reader",
      ...(isAutoVerified ? { verified: true } : {}),
    } as any)
    .returning();

  return newUser;
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const router: IRouter = Router();

router.get("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/callback`;
    const returnTo = getSafeReturnTo(req.query.returnTo);

    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: "openid email profile",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      nonce,
    });

    const cookieOpts = { httpOnly: true, secure: false, sameSite: "lax" as const, path: "/", maxAge: OIDC_COOKIE_TTL };
    res.cookie("oidc_cv", codeVerifier, cookieOpts);
    res.cookie("oidc_nonce", nonce, cookieOpts);
    res.cookie("oidc_state", state, cookieOpts);
    res.cookie("oidc_return", returnTo, cookieOpts);

    res.redirect(redirectTo.href);
  } catch (err) {
    console.error("OIDC login error:", err);
    res.redirect("/login?error=oidc");
  }
});

router.get("/callback", async (req: Request, res: Response): Promise<void> => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/callback`;

    const codeVerifier = req.cookies?.oidc_cv;
    const nonce = req.cookies?.oidc_nonce;
    const expectedState = req.cookies?.oidc_state;
    const returnTo = getSafeReturnTo(req.cookies?.oidc_return);

    res.clearCookie("oidc_cv", { path: "/" });
    res.clearCookie("oidc_nonce", { path: "/" });
    res.clearCookie("oidc_state", { path: "/" });
    res.clearCookie("oidc_return", { path: "/" });

    if (!codeVerifier || !expectedState) {
      res.redirect("/login?error=missing_state");
      return;
    }

    const currentUrl = new URL(`${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`);

    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims) {
      res.redirect("/login?error=no_claims");
      return;
    }

    const user = await upsertReplitUser(claims as unknown as Record<string, unknown>);
    req.session.userId = user.id;

    res.redirect(returnTo);
  } catch (err) {
    console.error("OIDC callback error:", err);
    res.redirect("/login?error=callback");
  }
});

router.get("/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

export default router;

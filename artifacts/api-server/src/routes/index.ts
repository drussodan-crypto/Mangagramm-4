import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import oidcRouter from "./oidc";
import usersRouter from "./users";
import seriesRouter from "./series";
import chaptersRouter from "./chapters";
import socialRouter from "./social";
import discoverRouter from "./discover";
import settingsRouter from "./settings";
import reactionsRouter from "./reactions";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(oidcRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(seriesRouter);
router.use(chaptersRouter);
router.use(socialRouter);
router.use(discoverRouter);
router.use(settingsRouter);
router.use(reactionsRouter);
router.use(storageRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import seriesRouter from "./series";
import chaptersRouter from "./chapters";
import socialRouter from "./social";
import discoverRouter from "./discover";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(seriesRouter);
router.use(chaptersRouter);
router.use(socialRouter);
router.use(discoverRouter);
router.use(settingsRouter);

export default router;

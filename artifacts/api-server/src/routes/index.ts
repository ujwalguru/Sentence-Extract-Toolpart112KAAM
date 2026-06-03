import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bridgeRouter from "./bridge";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bridgeRouter);
router.use(statsRouter);

export default router;

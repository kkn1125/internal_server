import express from "express";
import queryService from "../services/query.service.js";
const queryRouter = express.Router();

queryRouter.post("/enter", (req, res, next) => {
  queryService.attach(req, res, next);
});

queryRouter.post("/login", (req, res, next) => {
  queryService.login(req, res, next);
});

queryRouter.post("/logout", (req, res, next) => {
  queryService.logout(req, res, next);
});

// queryRouter.post("/players", (req, res, next) => {
//   queryService.players(req, res, next);
// });

queryRouter.post("/locations", (req, res, next) => {
  queryService.updateLocation(req, res, next);
});

export default queryRouter;

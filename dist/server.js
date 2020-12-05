"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var db_1 = require("./services/db");
var dotenv_1 = __importDefault(require("dotenv"));
require("colors");
require("reflect-metadata");
var env = dotenv_1.default.config({ path: './config/config.env' });
if (env.error) {
    throw env.error;
}
db_1.db.connect();
var app = express_1.default();
var PORT = process.env.PORT || 5000;

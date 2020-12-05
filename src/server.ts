import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import mongoose from 'mongoose';
import { db } from './services/db';
import dotenv from 'dotenv';
import 'colors';
import 'reflect-metadata';

const env = dotenv.config({ path: './config/config.env' });
if (env.error) {
	throw env.error;
}
db.connect();

const app = express();

const PORT = process.env.PORT || 5000;

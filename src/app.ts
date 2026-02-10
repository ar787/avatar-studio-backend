import express, { type Request, type Response } from 'express';

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World with TypeScript and Express66!');
});

export default app;

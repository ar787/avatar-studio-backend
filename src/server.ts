import app from './app.ts';
import config from './config/config.ts';

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on http://localhost:${config.port}`);
});

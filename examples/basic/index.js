const { createApp } = require('../../index');

async function main() {
  const { app, ready } = await createApp({
    port: 3000,
    database: { dialect: 'sqlite', storage: ':memory:' },
  });

  await ready;
  app.listen(3000, () => console.log('Basic example running on port 3000'));
}

main().catch(console.error);

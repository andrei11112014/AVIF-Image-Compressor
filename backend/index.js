const app = require('./src/app');
const { PORT } = require('./src/utils/constants');

app.listen(PORT, () => {
    console.log(`Server active on :${PORT}`);
});
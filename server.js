require('./config/configDB');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { route } = require('./routes/userRoute');
const express = require('express');
const PORT = process.env.PORT || 2422

const app = express();

app.use(express.json());
app.use(cors({
    origin: "*"
}))
app.use(fileUpload({ 
    useTempFiles: true
}))
app.use('/uploads', express.static('uploads'));
app.use('/progressPal', route)


app.get('/', (req, res)=>{
    res.send('Welcome to ProgressPal, Expect to see more..!')
})

app.listen(PORT, ()=>{
    console.log('listening on PORT: '+PORT);
});


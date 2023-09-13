const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    schoolName: {
        type: String,
        required: [true, 'School name is Required']
    },
    schoolEmail: {
        type: String,
        required: [true, 'School Email is required']
    },
    schoolAddress: {
        type: String,
        default: function() {
            return `No 1 ${this.schoolName}`;
        }
    },
    state: {
        type: String,
        default: 'Lagos'
    },
    country: {
        type: String,
        default: 'Nigeria'
    },
    schoolLogo: {
        type: String,
        default: function() {
            return `SchoolLogoAvatar`
        }
    },
    regNo: {
        type: String,
        default: `PRM-ABCD-${Math.floor(Math.random() * 9000) + 1000}`
    },
    password: {
        type: String,
        required: [true, 'Password is Required']
    },
    confirmPassword: {
        type: String,
        required: [true, 'Password is Required']
    },
    website: {
        type: String,
        default: function() {
            return this.schoolEmail;
        }
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isSuperAdmin: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    isLogin: {
        type: Boolean,
        default: false
    },
    teachers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'teachers'
    }]
}, {timestamps: true})

const userModel = mongoose.model('UserInfo', userSchema);

module.exports = userModel;
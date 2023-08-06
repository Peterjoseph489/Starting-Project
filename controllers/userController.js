require('dotenv').config();
const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const fs = require('fs');
const cloudinary = require('../utilities/cloudinary');
const { genToken, decodeToken } = require('../utilities/jwt');
const emailSender = require('../middlewares/email');
const { genEmailReg } = require('../utilities/schoolEmail/register');
const {forgetPassEmail} = require("../utilities/schoolEmail/forgetpassword")
const {genTeacherEmail} = require("../utilities/schoolEmail/teacherReg")
const { genTokenLogin, genTokensignUp } = require('../middlewares/AuthandAuth/login')



// Register a School
const register = async (req, res)=>{
    try {
        const {
            schoolName,
            schoolEmail,
            schoolAddress,
            state,
            country,
            schoolLogo,
            regNo,
            password,
            confirmPassword,
            website,
        } = req.body;
        const userLogo = req.files.schoolLogo.tempFilePath
        const uploadLogo = await cloudinary.uploader.upload(userLogo);

        if (password !== confirmPassword) {
            res.status(400).json({
                message: 'Make sure your Input Password corresponds with your Confirm Password'
            })
        } else {
            const isEmail = await userModel.findOne({schoolEmail});
            if (isEmail) {
                res.status(400).json({
                    message: `School with this Email: ${schoolEmail} already exist.`
                })
            } else {
                const salt = await bcrypt.genSalt(10);
                const hashConfirmPassword = await bcrypt.hash(confirmPassword, salt);
                const hashPassword = await bcrypt.hash(password, salt);
                const data = {
                    schoolName: schoolName.toUpperCase(),
                    schoolEmail: schoolEmail.toLowerCase(),
                    schoolAddress,
                    state,
                    country,
                    schoolLogo: uploadLogo.secure_url,
                    regNo,
                    password: hashPassword,
                    confirmPassword: hashConfirmPassword,
                    website
                }
                const user = new userModel(data);
                const tokens = await genTokensignUp(user)
                user.token = tokens;
                const savedUser = await user.save();
                const token = await genToken(savedUser._id, '3m');
                const subject = 'ProgressPal - Kindly Verify your School Registration'
                const link = `${req.protocol}://${req.get('host')}/progressPal/verify/${savedUser._id}/${token}`
                const html = await genEmailReg(link)
                emailSender({
                    email: schoolEmail,
                    subject,
                    html
                })
                if (!savedUser) {
                    res.status(400).json({
                        message: `Failed to create School account, Try Again.`
                    })
                } else {
                    res.status(201).json({
                        message: `${schoolName} has been successfully registered. Check your School Email to verify your account.`,
                        user: savedUser
                    })
                }
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};




// Verify Email
const verifyEmail = async (req, res)=>{
    try {
        const { token } = req.params;
        const { schoolId } = req.params;
        await jwt.verify(token, process.env.JWT_SECRET, async (err)=>{
            if(err) {
                res.json('This link is Expired. Send another Email Verification.')
            } else {
                const verify = await userModel.findByIdAndUpdate(schoolId, {isVerified: true});
                if (!verify) {
                    res.status(403).json({
                        message: 'User not verified, please try again.'
                    })
                } else {
                    res.status(200).json({
                        messge: `School with Email: ${verify.schoolEmail} verified successfully`
                    })
                }
            }
        })
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};



// Re-Send Email Verification
const resendEmailVerification = async (req, res)=>{
    try {
        const { schoolEmail } = req.body;
        const user = await userModel.findOne({schoolEmail});
        if (!user) {
            res.status(404).json({
                message: 'User not found'
            })
        } else {
            if (user.isVerified == true) {
                res.status(200).json({
                    message: 'Already Verified!'
                })
            } else {
                const token = await genToken(user._id, '3m')
                const subject = 'ProgressPal - Kindly Verify your School Registration'
                const link = `${req.protocol}://${req.get('host')}/progressPal/verify/${user._id}/${token}`
                const html = await genEmailReg(link)
                emailSender({
                    email: user.schoolEmail,
                    subject,
                    html
                })
                res.status(201).json({
                    message: `${user.schoolName} has been successfully registered. Check your School Email to verify your account.`,
                    user: user
                })
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};



// sign in
const logIn = async(req, res)=>{
    try {
        const { schoolEmail, password } = req.body;
        const user = await userModel.findOne({schoolEmail});
        if (!user) {
            res.status(404).json({
                message: 'School not found'
            });
        } else {
            if(!user.isVerified) {
                const token = await genToken(user._id, '3m');
                const subject = 'ProgressPal - Kindly Verify your School Registration'
                const link = `${req.protocol}://${req.get('host')}/progressPal/verify/${user._id}/${token}`
                const html = await genEmailReg(link)
                emailSender({
                    email: user.schoolEmail,
                    subject,
                    html
                })
                res.status(400).json({
                    message: `School: ${user.schoolName} not verified, Please, check your email for link to verify your account`
                })
            } else {
                const isPassword = await bcrypt.compare(password, user.confirmPassword);
                const islogin = await userModel.findByIdAndUpdate(user._id, {islogin: true});
                if(!isPassword) {
                    res.status(400).json({
                        message: 'Incorrect Password'
                    });
                } else {
                    const token = await genTokenLogin(user)
                    res.status(200).json({
                        message: 'Log in Successful',
                        token: token
                    });
                }
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};


const changePassword = async (req, res) => {
    try {
        const { password } = req.body;
        const { schoolId } = req.params;
        const userPassword = await userModel.findById(schoolId);
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const newPassword = await userModel.findByIdAndUpdate(userPassword, {password: hash}, {new: true});
        const newConfirmPassword = await userModel.findByIdAndUpdate(userPassword, {confirmPassword: hash}, {new: true});
        if (!newPassword) {
            res.status(400).json({
                message: 'Failed to Change Password'
            })
        } else {
            res.status(200).json({
                message: 'Password Changed Successfully',
                data: userPassword
            })
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};



const forgotPassword = async (req, res)=>{
    try {
        const { schoolEmail } = req.body;
        const isEmail = await userModel.findOne({ schoolEmail });
        if (!isEmail) {
            res.status(404).json({
                message: 'School Email not found'
            })
        } else {
            const token = await genToken(isEmail._id, '3m')
            const subject = 'ProgressPal - Link for Reset password'
            const link = `${req.protocol}://${req.get('host')}/progressPal/reset-password/${isEmail._id}/${token}`
            const html = await forgetPassEmail(link)
            emailSender({
                email: schoolEmail,
                subject,
                html
            });
            res.status(200).json({
                message: 'Email sent successfully, please check your Email for the link to reset your Password'
            })
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};



const resetPassword = async (req, res)=>{
    try {
        const { token } = req.params;
        const { password } = req.body;
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const userInfo = await decodeToken(token);
        const user = await userModel.findByIdAndUpdate(userInfo._id, { password: hash }, { new: true });
        const userConfirm = await userModel.findByIdAndUpdate(userInfo._id, { confirmPassword: hash }, { new: true });
        if (!user) {
            res.status(400).json({
                message: 'Could not Reset Password'
            })
        } else {
            res.status(200).json({
                message: "Password reset succesful.",
            });
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}



// Link for Registering a Teacher on ProgressPal.
const teacherLink = async (req, res)=>{
    try {
        const { teacherEmail } = req.body;
        const { schoolId } = req.params;
        const token = await genToken(schoolId, '30m');
        // console.log(token);
        const subject = 'ProgressPal - Teacher Registration'
        const link = `${req.protocol}://${req.get('host')}/progressPal/newTeacher/${schoolId}/${token}`
        const html = await genTeacherEmail(link, schoolId)
        emailSender({
            email: teacherEmail,
            subject,
            html
        })
        res.status(200).json({
            message: `Link for registration successfully sent to ${teacherEmail}`
        })
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}






const updateSchool = async (req, res)=>{
    try {
        const {
            schoolName,
            schoolEmail,
            schoolAddress,
            state,
            country,
            schoolLogo,
            regNo,
            website,
        } = req.body;
        // const userLogo = req.file.path;
        const userLogo = req.files.schoolLogo.tempFilePath
        const { schoolId } = req.params;
        const user = await userModel.findById(schoolId);

        if(!user) {
            res.status(404).json({
                message: 'User not Found'
            })
        } else {
            const data = {
                schoolName: schoolName || user.schoolName,
                schoolEmail: schoolEmail || user.schoolEmail,
                schoolAddress: schoolAddress || user.schoolAddress,
                state: state || user.state,
                country: country || user.country,
                schoolLogo: schoolLogo || user.schoolLogo,
                regNo: user.regNo,
                password: user.password,
                confirmPassword: user.confirmPassword,
                website: website || user.website,
                isAdmin: user.isAdmin,
                isSuperAdmin: user.isSuperAdmin,
                isVerified: user.isVerified,
                teachers: user.teachers
            }

            if (userLogo) {
                const public_id = user.schoolLogo.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(public_id);
                const newLogo = await cloudinary.uploader.upload(userLogo)
                data.schoolLogo = newLogo.secure_url
                const updatedSchoolwithLogo = await userModel.findByIdAndUpdate(schoolId, data, {new: true});
                if (!updatedSchoolwithLogo) {
                    res.status(400).json({
                        message: 'Could not update School Info with Logo'
                    })
                } else {
                    res.status(200).json({
                        message: 'Successfully Updated School Info with Logo',
                        data: updatedSchoolwithLogo
                    })
                }
            } else {
                const updatedSchool = await userModel.findByIdAndUpdate(schoolId, data, {new: true});
                if (!updatedSchool) {
                    res.status(400).json({
                        message: 'Could not update School Info'
                    })
                } else {
                    res.status(200).json({
                        message: 'Successfully Updated School Info',
                        data: updatedSchool
                    })
                }
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};




const deleteSchool = async (req, res)=>{
    try {
        const { schoolId } = req.params;
        const user = await userModel.findById(schoolId);
        if(!user) {
            res.status(404).json({
                message: 'User not Found'
            })
        } else {
            const public_id = user.schoolLogo.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(public_id);
            const deletedSchool = await userModel.findByIdAndDelete(schoolId);
            if (!deletedSchool) {
                res.status(400).json({
                    message: 'Error deleting School, Try Again.'
                })
            } else {
                res.status(200).json({
                    message: 'School Successfully deleted',
                    data: user
                })
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    };
}




// Read all Users
const readAllSchools = async (req, res)=>{
    try {
        const Schools = await userModel.find()
        if (Schools == 0) {
            res.status(404).json({
                message: 'No Schools Record'
            })
        } else {
            res.status(200).json({
                message: 'All Schools Records',
                data: Schools
            })
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};



// Read One User
const readOneSchool = async (req, res)=>{
    try {
        const schoolId = req.params.schoolId;
        const school = await userModel.findById(schoolId)
        if (school == 0) {
            res.status(404).json({
                message: 'No school Record'
            })
        } else {
            res.status(200).json({
                message: 'The school Record',
                data: school
            })
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};














// Sign Out
const signOut = async (req, res)=>{
    try {
        const { schoolId } = req.params;
        const blacklist = [];
        const hasAuthorization = req.headers.authorization;
        const token = hasAuthorization.split(" ")[1];
        blacklist.push(token);
        const logout = await userModel.findByIdAndUpdate(schoolId, {islogin: false}); 
        res.status(200).json({
            message: 'Logged out successfully'
        })
        console.log()
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};








module.exports = { 
    register,
    verifyEmail ,
    resendEmailVerification,
    logIn,
    signOut,
    changePassword,
    forgotPassword,
    resetPassword,
    updateSchool,
    deleteSchool,
    teacherLink,
    readAllSchools,
    readOneSchool
};

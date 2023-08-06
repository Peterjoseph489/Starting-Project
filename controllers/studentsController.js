const userModel = require('../models/userModel');
const teacherModel = require('../models/teachersModel');
const studentModel = require('../models/studentsModel');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const fs = require('fs');
const cloudinary = require('../utilities/cloudinary');
const { genToken, decodeToken } = require('../utilities/jwt');
const emailSender = require('../middlewares/email');
const { forgetPassEmail } = require('../utilities/studentEmail/forgetpassword')
const { genEmailReg } = require('../utilities/studentEmail/register')
const { link } = require('@hapi/joi');


const newStudent = async (req, res)=>{
    try {
        const {
            studentName,
            studentClass,
            studentAge,
            studentEmail,
            password
        } = req.body;
        const { teacherId } = req.params;
        const teacher = await teacherModel.findById(teacherId).populate('link').populate('students');
        // const studentPassport = req.file.path;
        const studentImage = req.files.studentPassport.tempFilePath
        const uploadImage = await cloudinary.uploader.upload(studentImage);
        const isEmail = await studentModel.findOne({studentEmail});
        if (isEmail) {
            res.status(400).json({
                message: `Student with this Email: ${studentEmail} already exist.`
            })
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashPassword = await bcrypt.hash(password, salt);
            const data = {
                studentName: studentName.toUpperCase(),
                studentClass,
                studentAge,
                studentEmail: studentEmail.toLowerCase(),
                password: hashPassword,
                studentPassport: uploadImage.secure_url
            }
            const student = await new studentModel(data);
            student.link = teacher;
            savedStudent = await student.save();
            teacher.students.push(savedStudent);
            teacher.save();
            const subject = 'ProgressPal - welcome!';const html = await genEmailReg(link, teacherId)
            emailSender({
                email: studentEmail,
                subject,
                html
            })
            res.status(200).json({
                message: 'Student saved successfully',
                data
            })
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};



// Login
const studentLogin = async (req, res)=>{
    try {
        const { studentEmail, password } = req.body;
        const user = await studentModel.findOne({studentEmail});
        if (!user) {
            res.status(404).json({
                message: `Student with Email: ${studentEmail} not found.`
            });
        } else {
            const isPassword = await bcrypt.compare(password, user.password);
            if(!isPassword) {
                res.status(400).json({
                    message: 'Incorrect Password'
                })
            } else {
                const token = await genToken(user._id, '30m');
                res.status(200).json({
                    message: 'Log in Successful',
                    token: token
                })
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};


// Change Password
const changePasswordStudent = async (req, res) => {
    try {
        const { password } = req.body;
        const { studentId } = req.params;
        const userPassword = await studentModel.findById(studentId);
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const newPassword = await studentModel.findByIdAndUpdate(userPassword, {password: hash}, {new: true});
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


// Forgot Password
const forgotPasswordStudent = async (req, res)=>{
    try {
        const { studentEmail } = req.body;
        const isEmail = await studentModel.findOne({ studentEmail });
        if (!isEmail) {
            res.status(404).json({
                message: 'Teacher Email not found'
            })
        } else {
            const token = await genToken(isEmail._id, '30m')
            const subject = 'ProgressPal - Link for Reset password'
            const link = `${req.protocol}://${req.get('host')}/progressPal/reset-passwordStudent/${isEmail._id}/${token}`
            // const message = `Forgot your Password? it's okay, kindly use this link ${link} to re-set your account password. Please note that this link will expire after 5(five) Minutes.`
            const html = await forgetPassEmail(link)
            emailSender({
                email: studentEmail,
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


// Reset Password
const resetPasswordStudent = async (req, res)=>{
    try {
        const { token } = req.params;
        const { studentId } = req.params;
        const { password } = req.body;
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const user = await studentModel.findByIdAndUpdate(studentId, { password: hash }, { new: true });
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
};


// Update School
const updateSchoolStudent = async (req, res)=>{
    try {
        const {
            studentName,
            studentClass,
            studentAge,
            studentEmail,
        } = req.body;
        // const userLogo = req.file.path;
        const userLogo = req.files.studentPassport.tempFilePath;
        const { studentId } = req.params;
        const user = await studentModel.findById(studentId);
        if(!user) {
            res.status(404).json({
                message: 'Teacher not Found'
            })
        } else {
            const data = {
                studentName: studentName || user.studentName,
                studentClass: studentClass || user.studentClass,
                studentAge: studentAge || user.studentAge,
                studentEmail: studentEmail || user.studentEmail,
                studentPassport: user.studentPassport,
                password: user.password,
                link: user.link,
                students: user.students
            }
            if (userLogo) {
                const public_id = user.studentPassport.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(public_id);
                const newImage = await cloudinary.uploader.upload(userLogo)
                data.studentPassport = newImage.secure_url
                const updatedTeacherwithImage = await studentModel.findByIdAndUpdate(studentId, data, {new: true});
                if (!updatedTeacherwithImage) {
                    res.status(400).json({
                        message: 'Could not update student Info with Image'
                    })
                } else {
                    res.status(200).json({
                        message: 'Successfully Updated student Info with Image',
                        data: updatedTeacherwithImage
                    })
                }
            } else {
                const updatedTeacher = await studentModel.findByIdAndUpdate(studentId, data, {new: true});
                if (!updatedTeacher) {
                    res.status(400).json({
                        message: 'Could not update student Info with Image'
                    })
                } else {
                    res.status(200).json({
                        message: 'Successfully Updated student Info with Image',
                        data: updatedTeacher
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


// Delete Teacher
const deleteSchoolStudent = async (req, res)=>{
    try {
        const { studentId } = req.params;
        const user = await studentModel.findById(studentId);
        if(!user) {
            res.status(404).json({
                message: 'User not Found'
            })
        } else {
            const public_id = user.studentPassport.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(public_id);
            const deletedTeacher = await studentModel.findByIdAndDelete(studentId);
            if (!deletedTeacher) {
                res.status(400).json({
                    message: 'Error deleting student Info, Try Again.'
                })
            } else {
                res.status(200).json({
                    message: 'Student Successfully deleted',
                    data: user
                })
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};


// Sign Out
const signOutStudent = async (req, res)=>{
    try {
        const { studentId } = req.params;
        const blacklist = [];
        const hasAuthorization = req.headers.authorization;
        const token = hasAuthorization.split(" ")[1];
        blacklist.push(token); 
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




// Read all Students
const readAllStudent = async (req, res)=>{
    try {
        const students = await studentModel.find()
        if (students == 0) {
            res.status(404).json({
                message: 'No students Record'
            })
        } else {
            res.status(200).json({
                message: 'All students Records',
                data: students
            })
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};



// Read One Teacher
const readOneStudent = async (req, res)=>{
    try {
        const studentId = req.params.studentId;
        const student = await studentModel.findById(studentId)
        if (student == 0) {
            res.status(404).json({
                message: 'No teacher Record'
            })
        } else {
            res.status(200).json({
                message: 'The teacher Record',
                data: student
            })
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}








module.exports = {
    newStudent,
    studentLogin,
    changePasswordStudent,
    forgotPasswordStudent,
    resetPasswordStudent,
    updateSchoolStudent,
    deleteSchoolStudent,
    signOutStudent,
    readAllStudent,
    readOneStudent
}
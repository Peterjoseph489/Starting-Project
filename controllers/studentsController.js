const userModel = require('../models/userModel');
const teacherModel = require('../models/teachersModel');
const studentModel = require('../models/studentsModel');
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const fs = require('fs');
const cloudinary = require('../utilities/cloudinary');
const { genToken, decodeToken, decodeTokenT, decodeTokenS } = require('../utilities/jwt');
const emailSender = require('../middlewares/email');
const { forgetPassEmail } = require('../utilities/studentEmail/forgetpassword')
const { genEmailReg } = require('../utilities/studentEmail/register')
const { link } = require('@hapi/joi');
const { genTokenLoginS, genTokensignUpS } = require('../middlewares/AuthandAuth/login')








const newStudent = async (req, res) => {
    try {
        const {
            studentName,
            studentClass,
            studentAge,
            studentEmail,
            password
        } = req.body;
        const { teacherId } = req.params;
        
        const teacher = await teacherModel.findById(teacherId);
        
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }


        // Check if the associated school has paid the fee
        const school = await userModel.findById(teacher.link);
        if (school.isPaid === false) {
            // Check the number of students associated with the teacher
            const studentsCount = await studentModel.countDocuments({ link: teacherId });
            if (studentsCount === 10) {
                return res.status(400).json({
                    message: "Teacher has reached the maximum allowed number of students."
                });
            } else {
                const salt = await bcrypt.genSalt(10);
                const hashPassword = await bcrypt.hash(password, salt);
        
                const data = {
                    studentName: studentName.toUpperCase(),
                    studentClass,
                    studentAge,
                    studentEmail: studentEmail.toLowerCase(),
                    password: hashPassword
                };
        
                if (req.files) {
                    const studentImage = req.files.studentPassport.tempFilePath;
                    const uploadImage = await cloudinary.uploader.upload(studentImage);
                    data.studentPassport = uploadImage.secure_url;
                }
        
                const student = new studentModel(data);
                // const tokens = await genToken(student, '1d');
                // student.token = tokens;
                student.link = teacher._id;
        
                await student.save();
                
                teacher.students.push(student._id);
                await teacher.save();
                
                const subject = 'ProgressPal - welcome!';
                const link = `${req.protocol}://${req.get('host')}/progressPal`;
                const html = await genEmailReg(link, teacherId, student);
                
                emailSender({
                    email: studentEmail,
                    subject,
                    html
                });
        
                res.status(201).json({
                    message: 'Student saved successfully',
                    student
                });
            }
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashPassword = await bcrypt.hash(password, salt);
    
            const data = {
                studentName: studentName.toUpperCase(),
                studentClass,
                studentAge,
                studentEmail: studentEmail.toLowerCase(),
                password: hashPassword
            };
    
            if (req.files) {
                const studentImage = req.files.studentPassport.tempFilePath;
                const uploadImage = await cloudinary.uploader.upload(studentImage);
                data.studentPassport = uploadImage.secure_url;
            }
    
            const student = new studentModel(data);
            // const tokens = await genToken(student, '1d');
            // student.token = tokens;
            student.link = teacher._id;
    
            await student.save();
            
            teacher.students.push(student._id);
            await teacher.save();
            
            const subject = 'ProgressPal - welcome!';
            const link = `${req.protocol}://${req.get('host')}/progressPal`;
            const html = await genEmailReg(link, teacherId, student);
            
            emailSender({
                email: studentEmail,
                subject,
                html
            });
    
            res.status(201).json({
                message: 'Student saved successfully',
                student
            });
        }












    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};









// Login
const studentLogin = async (req, res) => {
    try {
        const { studentEmail, password } = req.body;
        const user = await studentModel.findOne({ studentEmail }).populate('link');

        if (!user) {
            res.status(404).json({
                message: `Student with Email: ${studentEmail} not found.`
            });
        } else {
            const isPassword = await bcrypt.compare(password, user.password);
            const islogin = await studentModel.findByIdAndUpdate(user._id, { islogin: true });

            if (!isPassword) {
                res.status(400).json({
                    message: 'Incorrect Password'
                });
            } else {
                // Populate the nested relationship inside the 'link' field
                await user.link.populate('link');

                const token = await genToken(user, '1d');

                res.status(200).json({
                    message: 'Log in Successful',
                    data: islogin,
                    teacher: user.link, // Access the populated 'link' data directly from the user object
                    school: user.link.link, // Access the populated nested reference
                    token: token
                });
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
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
            const token = await genToken(isEmail._id, '1d')
            const subject = 'ProgressPal - Link for Reset password'
            // const link = `${req.protocol}://${req.get('host')}/progressPal/reset-passwordStudent/${isEmail._id}/${token}`
            const link = `https://progresspal-8rxj.onrender.com/progressPal/student_reset_password/${token}`
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
        // const { studentId } = req.params;
        const { password } = req.body;
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const userInfo = await decodeTokenS(token);
        const user = await studentModel.findByIdAndUpdate(userInfo._id, { password: hash }, { new: true });
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


 // Update Student
const updateSchoolStudent = async (req, res) => {
    try {
        const {
            studentName,
            studentClass,
            studentAge,
            studentEmail,
        } = req.body;

        
        const { studentId } = req.params;
        const user = await studentModel.findById(studentId);

        if (!user) {
            return res.status(404).json({
                message: 'Student not Found'
            });
        }

        const data = {
            studentName: studentName.toUpperCase() || user.studentName,
            studentClass: studentClass || user.studentClass,
            studentAge: studentAge || user.studentAge,
            studentEmail: studentEmail.toLowerCase() || user.studentEmail,
            studentPassport: user.studentPassport,
            password: user.password,
            link: user.link,
            students: user.students
        };

        if (req.files) {
            const userLogo = req.files.studentPassport.tempFilePath;
            const public_id = user.studentPassport.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(public_id);
            const newImage = await cloudinary.uploader.upload(userLogo);
            data.studentPassport = newImage.secure_url;

            const updatedStudentWithImage = await studentModel.findByIdAndUpdate(studentId, data, { new: true });

            if (!updatedStudentWithImage) {
                res.status(400).json({
                    message: 'Could not update student Info with Image'
                });
            } else {
                res.status(200).json({
                    message: 'Successfully Updated student Info with Image',
                    data: updatedStudentWithImage
                });
            }
        } else {
            const updatedStudent = await studentModel.findByIdAndUpdate(studentId, data, { new: true });

            if (!updatedStudent) {
                res.status(400).json({
                    message: 'Could not update student Info'
                });
            } else {
                res.status(200).json({
                    message: 'Successfully Updated student Info',
                    data: updatedStudent
                });
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
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
        // const blacklist = [];
        // const hasAuthorization = req.headers.authorization;
        // const token = hasAuthorization.split(" ")[1];
        // blacklist.push(token); 
        // blacklist.push(hasAuthorization); 
        const logout = await studentModel.findByIdAndUpdate(studentId, {islogin: false}); 
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
        if (!student) {
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







// const schoolStudents = async (req, res)=>{
//     try {
//         const { schoolId } = req.params;
//         const school = await userModel.findById(schoolId).populate('teachers'); 
//         if (school.teachers.length == 0) {
//             res.status(400).json({
//                 message: 'No student Recorded at the moment'
//             })
//         } else {
//             res.status(200).json({
//                 message: 'All students recorded for this school',
//                 data: school.teachers
//             })
//         }
//     } catch (error) {
//         res.status(500).json({
//             message: error.message
//         })
//     }
// }








const schoolStudents = async (req, res) => {
    try {
        const { schoolId } = req.params;
        
        // Find the school by ID and populate its 'teachers' field
        const school = await userModel.findById(schoolId).populate({
            path: 'teachers',
            populate: {
                path: 'students', // Assuming the 'teachers' reference the 'students' collection
                model: 'students' // Replace with the actual model name for students
            }
        });

        if (!school) {
            return res.status(404).json({
                message: 'School not found'
            });
        } else if (school.teachers.length === 0) {
            return res.status(400).json({
                message: 'No students recorded at the moment'
            });
        } else {
            // Collect all students from teachers' students references
            const allStudents = school.teachers.flatMap(teacher => teacher.students);
            
            res.status(200).json({
                message: 'All students recorded for this school',
                data: allStudents
            });
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};













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
    readOneStudent,
    schoolStudents
}
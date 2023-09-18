const userModel = require('../models/userModel');
const teacherModel = require('../models/teachersModel');
const studentModel = require('../models/studentsModel');
const resultModel = require('../models/resultsModel');
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


const createResult = async (req, res)=>{
    try {
        const {
            subName1, subName2, subName3, subName4, subName5, subName6, subName7, subName8, subName9, subName10,
            subTest1, subTest2, subTest3, subTest4, subTest5, subTest6, subTest7, subTest8, subTest9, subTest10,
            subExam1, subExam2, subExam3, subExam4, subExam5, subExam6, subExam7, subExam8, subExam9, subExam10,
            subTotal1, subTotal2, subTotal3, subTotal4, subTotal5, subTotal6, subTotal7, subTotal8, subTotal9, subTotal10,
            resultTotal, teachersRemark, resultYear, resultTerm
        } = req.body;
        const data = {
            subName1, subName2, subName3, subName4, subName5, subName6, subName7, subName8, subName9, subName10,
            subTest1, subTest2, subTest3, subTest4, subTest5, subTest6, subTest7, subTest8, subTest9, subTest10,
            subExam1, subExam2, subExam3, subExam4, subExam5, subExam6, subExam7, subExam8, subExam9, subExam10,
            subTotal1, subTotal2, subTotal3, subTotal4, subTotal5, subTotal6, subTotal7, subTotal8, subTotal9, subTotal10,
            resultTotal, teachersRemark, resultYear, resultTerm
        } 
        const { studentId } = req.params;
        const student = await studentModel.findById(studentId).populate('link').populate('results');
        const result = await new resultModel(data);
        result.link = student._id;await result.save();
        student.results.push(result._id);
        student.save();
        if (!result){
            res.status(400).json({
                message: 'Error creating student result'
            })
        } else {
            res.status(201).json({
                message: 'Success creating student result',
                data: result
            })
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};



const studentAllResult = async (req, res)=>{
    try {
        const { studentId } = req.params;
        const student = await studentModel.findById(studentId).populate('link').populate('results');
        // console.log(student.results);
        if (!student) {
            res.status(404).json({
                message: 'Student not found'
            })
        } else {
            if(student.results.length == 0) {
                res.status(400).json({
                    message: 'No result for this student yet.'
                })
            } else {
                res.status(200).json({
                    message: 'All Results for this student.',
                    data: student.results
                });
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}


const allResults = async (req, res)=>{
    try {
        const results = await resultModel.find();
        if(results.length == 0) {
            res.status(400).json({
                message: 'No results found'
            })
        } else {
            res.status(200).json({
                message: 'All results',
                data: results
            })
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
};


const oneResult = async (req, res)=>{
    try {
        const { resultId } = req.params;
        const result = await resultModel.findById(resultId);
        if (!result) {
            res.status(404).json({
                message: 'No result found'
            });
        } else {
            res.status(200).json({
                message: 'Result Found',
                data: result
            })
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}



const updateResult = async (req, res)=>{
    try {
        const { resultId }= req.params;
        const {
            subName1, subName2, subName3, subName4, subName5, subName6, subName7, subName8, subName9, subName10,
            subTest1, subTest2, subTest3, subTest4, subTest5, subTest6, subTest7, subTest8, subTest9, subTest10,
            subExam1, subExam2, subExam3, subExam4, subExam5, subExam6, subExam7, subExam8, subExam9, subExam10,
            subTotal1, subTotal2, subTotal3, subTotal4, subTotal5, subTotal6, subTotal7, subTotal8, subTotal9, subTotal10,
            resultTotal, teachersRemark, resultYear, resultTerm
        } = req.body;
        const result = await resultModel.findById(resultId);
        if (!result) {
            res.status(404).json({
                message: 'No result found'
            })
        } else {
            const data = {
                subName1: subName1 || result.subName1, subName2: subName2 || result.subName2, subName3: subName3 || result.subName3, subName4: subName4 || result.subName4, subName5: subName5 || result.subName5, subName6: subName6 || result.subName6, subName7: subName7 || result.subName7, subName8: subName8 || result.subName8, subName9: subName9 || result.subName9, subName10: subName10 || result.subName10,
                subTest1: subTest1 || result.subTest1, subTest2: subTest2 || result.subTest2, subTest3: subTest3 || result.subTest3, subTest4: subTest4 || result.subTest4, subTest5: subTest5 || result.subTest5, subTest6: subTest6 || result.subTest6, subTest7: subTest7 || result.subTest7, subTest8: subTest8 || result.subTest8, subTest9: subTest9 || result.subTest9, subTest10: subTest10 || result.subTest10,
                subExam1: subExam1 || result.subExam1, subExam2: subExam2 || result.subExam2, subExam3: subExam3 || result.subExam3, subExam4: subExam4 || result.subExam4, subExam5: subExam5 || result.subExam5, subExam6: subExam6 || result.subExam6, subExam7: subExam7 || result.subExam7, subExam8: subExam8 || result.subExam8, subExam9: subExam9 || result.subExam9, subExam10: subExam10 || result.subExam10,
                subTotal1: subTotal1 || result.subTotal1, subTotal2: subTotal2 || result.subTotal2, subTotal3: subTotal3 || result.subTotal3, subTotal4: subTotal4 || result.subTotal4, subTotal5: subTotal5 || result.subTotal5, subTotal6: subTotal6 || result.subTotal6, subTotal7: subTotal7 || result.subTotal7, subTotal8: subTotal8 || result.subTotal8, subTotal9: subTotal9 || result.subTotal9, subTotal10: subTotal10 || result.subTotal10,
                resultTotal: resultTotal || result.resultTotal, teachersRemark: teachersRemark || result.teachersRemark, resultYear: resultYear || result.resultYear, resultTerm: resultTerm || result.resultTerm
            }
            const updatedResult = await resultModel.findByIdAndUpdate(resultId, data, {new: true});
            if (!updatedResult) {
                res.status(400).json({
                    message: 'Unable to Update result. Please try again'
                })
            } else {
                res.status(200).json({
                    message: 'Successfully updated result',
                    data: updatedResult
                })
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}




const deleteResult = async (req, res)=>{
    try {
        const { resultId } = req.params;
        const { studentId } = req.params;
        const result = await resultModel.findById(resultId);
        const student = await studentModel.findById(studentId).populate('results');
        // console.log(student.results);
        if (!result) {
            res.status(404).json({
                message: 'Result not found'
            });
        } else {
            const deleteResult = await resultModel.findByIdAndDelete(resultId);
            student.results.filter(item => item !== result)
            student.save();
            if (!deleteResult) {
                res.status(400).json({
                    message: 'Unable to delete Result, Please try again'
                })
            } else {
                res.status(200).json({
                    message: 'Result deleted successfully',
                    data: result
                });
            }
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}








const schoolResults = async (req, res) => {
    try {
        const { schoolId } = req.params;

        // Find the school by ID and populate its 'teachers' field
        const school = await userModel.findById(schoolId).populate({
            path: 'teachers',
            populate: {
                path: 'students', // Assuming the 'teachers' reference the 'students' collection
                model: 'students', // Replace with the actual model name for students
                populate: {
                    path: 'results', // Assuming the 'students' reference the 'results' collection
                    model: 'results' // Replace with the actual model name for results
                }
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
            // Collect all results from students' results references
            const allResults = school.teachers.flatMap(teacher =>
                teacher.students.flatMap(student => student.results)
            );

            res.status(200).json({
                message: 'All results recorded for this school',
                data: allResults
            });
        }
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};





module.exports = {
    createResult,
    studentAllResult,
    allResults,
    oneResult,
    updateResult,
    deleteResult,
    schoolResults
}
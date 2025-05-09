const {validate} = require('node-model-validation');
const SurveySchedule = require('../models/surveyschedule');
const FilledSurvey = require ('../models/filledsurvey');
const Store = require ('../models/store');
const { v4: uuidv4 } = require('uuid');
 
const surveyScheduleModel = {
    scheduleDate: {
        type: String,
        isRequired: true
    },
    corporateClientId: {
        type: String,
        isRequired: true
    },
    countryId: {
        type: String,
        isRequired: true
    },
    storeDetails: {
        type: Array,
        isRequired: true
    }
}

// Create and Save a new Schedule
module.exports.create = (req, res) => {
    // Validate request
    if (!req.body) {
        return res.status(400).json({
            message: "Schedule request cannot be empty"
        });
    }

    let result = validate(req.body, surveyScheduleModel);
    if(result.errors) {
        return res.status(400).json(result);
    }

    // Create a store
    let defaultId = uuidv4();
    const surveySchedule = new SurveySchedule({
        _id: defaultId,
        scheduleId: defaultId,
        scheduleDate: req.body.scheduleDate,
        countryId: req.body.countryId,
        corporateClientId: req.body.corporateClientId,
        storeDetails: req.body.storeDetails,
        hasSubmitted: req.body.hasSubmitted
    });

    // Save survey schedule in the database
    surveySchedule.save()
        .then(data => {
            res.status(200).json(data);
        }).catch(err => {
            res.status(500).send({
                message: err.message || "Some error occurred while creating the schedule."
            });
        });
};

// Find schedules with a corporate client id
module.exports.getByCorporateClientId = (req, res) => {
    if (!req.params.corporateClientId) {
        return res.status(400).json({
            message: "Corporate client Id cannot be empty"
        });
    }

    SurveySchedule.find({'corporateClientId': req.params.corporateClientId }).sort({scheduleDate: 'desc'})
    .then(data => {
        if(!data) {
            return res.status(404).json({
                message: "Schedule request not found for the client " + req.params.corporateClientId
            });            
        }
        res.json(data);
    }).catch(err => {
        if(err.kind === 'ObjectId') {
            return res.status(404).json({
                message: "Schedule request not found for the client " + req.params.corporateClientId
            });                
        }
        return res.status(500).json({
            message: "Error retrieving Schedule request for the client " + req.params.corporateClientId
        });
    });
};

// Find schedules with a corporate client id
module.exports.getSubmittedByCorporateClientId = (req, res) => {
    if (!req.params.corporateClientId) {
        return res.status(400).json({
            message: "Corporate client Id cannot be empty"
        });
    }

    SurveySchedule.find({'corporateClientId': req.params.corporateClientId }).sort({scheduleDate: 'asc'})
    .then(data => {
        if(!data) {
            return res.status(404).json({
                message: "Schedule request not found for the client " + req.params.corporateClientId
            });            
        }
        res.json(data);
    }).catch(err => {
        if(err.kind === 'ObjectId') {
            return res.status(404).json({
                message: "Schedule request not found for the client " + req.params.corporateClientId
            });                
        }
        return res.status(500).json({
            message: "Error retrieving Schedule request for the client " + req.params.corporateClientId
        });
    });
};

// Find schedules with a schedule id
module.exports.getByScheduleId = (req, res) => {
    if (!req.params.scheduleId) {
        return res.status(400).json({
            message: "Schedule Id cannot be empty"
        });
    }

    SurveySchedule.find({'scheduleId': req.params.scheduleId })
    .then(data => {
        if(!data) {
            return res.status(404).json({
                message: "Schedule request not found with id " + req.params.scheduleId
            });            
        }
        res.json(data);
    }).catch(err => {
        if(err.kind === 'ObjectId') {
            return res.status(404).json({
                message: "Schedule request not found with id " + req.params.scheduleId
            });                
        }
        return res.status(500).json({
            message: "Error retrieving Schedule request with id " + req.params.scheduleId
        });
    });
};

// Find schedules with a corporate client id
module.exports.getCurrentMonthScheduleByCountry = (req, res) => {
    if (!req.body.corporateClientId) {
        return res.status(400).json({
            message: "Corporate client Id cannot be empty"
        });
    }

    if (!req.body.countryId) {
        return res.status(400).json({
            message: "Country Id cannot be empty"
        });
    }

    if (!req.body.fromDate) {
        return res.status(400).json({
            message: "fromDate cannot be empty"
        });
    }

    if (!req.body.toDate) {
        return res.status(400).json({
            message: "toDate cannot be empty"
        });
    }

    SurveySchedule.find({'corporateClientId': req.body.corporateClientId,
                         'countryId': req.body.countryId,
                         'scheduleDate': {"$gte": new Date(req.body.fromDate), "$lte": new Date(req.body.toDate)}
                         })
    .then(data => {
        if(!data) {
            return res.status(404).json({
                message: "Schedule request not found for the client " + req.params.corporateClientId
            });            
        }
        res.json(data);
    }).catch(err => {
        if(err.kind === 'ObjectId') {
            return res.status(404).json({
                message: "Schedule request not found for the client " + req.params.corporateClientId
            });                
        }
        return res.status(500).json({
            message: "Error retrieving Schedule request for the client " + req.params.corporateClientId
        });
    });
};

// Find schedules with a corporate client id
module.exports.getCurrentMonthSchedule = (req, res) => {
    if (!req.body.corporateClientId) {
        return res.status(400).json({
            message: "Corporate client Id cannot be empty"
        });
    }

    if (!req.body.fromDate) {
        return res.status(400).json({
            message: "fromDate cannot be empty"
        });
    }

    if (!req.body.toDate) {
        return res.status(400).json({
            message: "toDate cannot be empty"
        });
    }

    SurveySchedule.find({'corporateClientId': req.body.corporateClientId,
                         'scheduleDate': {"$gte": new Date(req.body.fromDate), "$lte": new Date(req.body.toDate)}
                         })
    .then(data => {
        if(!data) {
            return res.status(404).json({
                message: "Schedule request not found for the client " + req.params.corporateClientId
            });            
        }
        res.json(data);
    }).catch(err => {
        if(err.kind === 'ObjectId') {
            return res.status(404).json({
                message: "Schedule request not found for the client " + req.params.corporateClientId
            });                
        }
        return res.status(500).json({
            message: "Error retrieving Schedule request for the client " + req.params.corporateClientId
        });
    });
};

// Update a schedule identified by the schedule id in the request
module.exports.update = (req, res) => {
    // Validate Request
    if (!req.body) {
        return res.status(400).json({
            message: "Schedule can not be empty"
        });
    }

    // Find schedule and update it with the request body
    SurveySchedule.findByIdAndUpdate(req.params.scheduleId, {
        scheduleId: req.params.scheduleId,
        scheduleDate: req.body.scheduleDate,
        countryId: req.body.countryId,
        corporateClientId: req.body.corporateClientId,
        storeDetails: req.body.storeDetails,
        hasSubmitted: req.body.hasSubmitted
    }, { new: true })
        .then(data => {
            if (!data) {
                return res.status(404).json({
                    message: "Schedule request not found with id " + req.params.scheduleId
                });
            }
            res.json(data);
        }).catch(err => {
            if (err.kind === 'ObjectId') {
                return res.status(404).json({
                    message: "Schedule request not found with id " + req.params.scheduleId
                });
            }
            return res.status(500).json({
                message: "Error updating Schedule request with id " + req.params.scheduleId
            });
        });
};

// Delete a schedule with the specified scheduleId in the request
module.exports.delete = (req, res) => {
    SurveySchedule.findByIdAndRemove(req.params.scheduleId)
    .then(data => {
        if(!data) {
            return res.status(404).json({
                message: "Schedule request not found with id " + req.params.scheduleId
            });
        }
        res.json({message: "Schedule request deleted successfully!"});
    }).catch(err => {
        if(err.kind === 'ObjectId' || err.name === 'NotFound') {
            return res.status(404).json({
                message: "Schedule request not found with id " + req.params.scheduleId
            });                
        }
        return res.status(500).json({
            message: "Could not delete Schedule request with id " + req.params.scheduleId
        });
    });
};

// Find schedules with a corporate client id
module.exports.isSurveyApproved = (req, res) => {
    if (!req.params.filledSurveyId) {
        return res.status(400).json({
            message: "Filled Survey Id cannot be empty"
        });
    }
    Store.find({'storeId': req.params.filledSurveyId })
    .then(storedata=> {
        //console.log(storedata);
        FilledSurvey.find({'storeName': storedata[0].storeName,
        'approved': true
        })
            .then(data => {
            if(!data) {
            return res.status(404).json({
            message: "Approved survey not found for the survey id " + req.params.filledSurveyId
            });            
            }
            //console.log(data);
            if(data) {
            if(data.length > 0) {
            res.json(true);
            }
            else {
            res.json(false);
            }
            }
            else {
            res.json(false);
            }

            }).catch(err => {
            if(err.kind === 'ObjectId') {
            return res.status(404).json({
            message: "Approved survey not found for the survey id " + req.params.filledSurveyId
            });                
            }
            return res.status(500).json({
            message: "Error retrieving Approved request for the survey " + req.params.filledSurveyId
            });
            });
    })


};

// Find schedules 
module.exports.getAll = (req, res) => {
    SurveySchedule.find()
    .then(data=> {
            res.status(200).json(data);
        }).catch(err => {
            return res.status(500).json({
            message: "Error retrieving Approved request for the survey "
            });
    })
};
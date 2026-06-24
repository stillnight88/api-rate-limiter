import { Types } from "mongoose";

export const sendSuccessResponse = (res, statuscode, message, data = null) => {
    const jsonData = {
        success: true,
        message,
    };
    if (data) jsonData.data = data;
    return res.status(statuscode).json(jsonData);
};

export const sendErrorResponse = (res, statuscode, message) => {
    return res.status(statuscode).json({
        success: false,
        message
    });
};

export const validateObjectId = (id) => Types.ObjectId.isValid(id);
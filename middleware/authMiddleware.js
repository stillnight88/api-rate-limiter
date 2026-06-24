import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendErrorResponse } from "../utils/responseHelpers.js";

const extractTokenFromHeader = (authHeader) => {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    };
    return authHeader.substring(7)
};

export const protect = async (req, res, next) => {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
        return sendErrorResponse(res, 401, 'Access denied. No token provided');
    };

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).lean();;
        if (!user) {
            return sendErrorResponse(res, 401, 'Access denied. User no longer exists');
        };

        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role
        };

        next();

    } catch (error) {
        console.error("Auth middleware error:", error);
        return sendErrorResponse(res, 401, 'Not authorized, token failed');
    };
};
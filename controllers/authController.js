import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { sendErrorResponse, sendSuccessResponse } from '../utils/responseHelpers.js';

const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const createUserPayload = (user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
});

export const signUp = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email })
            .select('email')
            .lean();
        if (existingUser) {
            return sendErrorResponse(res, 409, `User with this email already exists`);
        };

        const newUser = new User({ name, email, password, role });
        await newUser.save();

        return sendSuccessResponse(res, 201, 'User registered successfully');
    } catch (error) {
        console.error("SignUp error:", error);
        return sendErrorResponse(res, 500, 'Internal SignUp error');
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return sendErrorResponse(res, 401, 'No User')
        };

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return sendErrorResponse(res, 401, 'Invalid credentials');
        };

        const userPayload = createUserPayload(user);
        const token = generateToken(userPayload);

        return sendSuccessResponse(res, 200, 'Login successful', {
            token,
            user: userPayload
        });

    } catch (error) {
        console.error("Login error:", error);
        return sendErrorResponse(res, 500, "Internal Login error:");
    };
};
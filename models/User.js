import mongoose from "mongoose";
import bcrypt from "bcrypt";
import validator from 'validator';

export const Roles = {
    GUEST:'guest',
    BASIC: 'basic',
    PREMIUM: 'premium',
    ADMIN: 'admin',
};

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        maxlength: [25, "Name cannot exceed 25 characters"],
        minlength: [2, "Name must be at least 2 characters"]
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: v => validator.isEmail(v),
            message: props => `${props.value} is not a valid email!`
        }
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters"],
        select: false
    },
    role: {
        type: String,
        enum: {
            values: Object.values(Roles),
            message: "Role must be either 'basic', 'premium or 'admin'"
        },
        default: 'user',
        index: true
    }
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next(); 
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
    if (!candidatePassword) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);
export default User;
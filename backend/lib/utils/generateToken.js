import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (userId,res) => {
    // generate a token with the user id
    const token = jwt.sign({userId},process.env.JWT_SECRET, {
        expiresIn: '15d',
    })

    // 设置一个名为‘jwt’的cookie，包含生成的token
    res.cookie("jwt",token,{
        maxAge: 15*24*60*60*1000, // MS
        httpOnly: true, // prevent xss attacks cross-site scripting attacks
        sameSite: "strict", //  CSRF attacks cross-site request forgrey attacks
        secure: process.env.NODE_ENV !== "development",
    });
};
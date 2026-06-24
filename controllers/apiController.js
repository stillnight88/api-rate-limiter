export const publicApi = (req, res) => {
  res.json({ message: 'Hello, world! This is a public API.' });
};

export const protectedApi = (req, res) => {
  res.json({
    message: `Welcome ${req.user.username}, you are on a protected route.`,
    role: req.user.role
  });
};

// ============================= FIREBASE OTP =============================
function onCaptchaVerify() {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",
        callback: (response) => {
          onSignUp();
        },
        "expired-callback": () => {},
      },
      auth
    );
  }
}

// when click on send otp
function onSignUp(e) {
  e.preventDefault();
  setLoading(true);
  onCaptchaVerify();
  const appVerifier = window.recaptchaVerifier;
  const formatPh = "+91" + ph;
  signInWithPhoneNumber(auth, formatPh, appVerifier)
    .then((confirmationResult) => {
      window.confirmationResult = confirmationResult;
      setLoading(false);
      setShowOTP(true);
      message.success("OTP sent successfully");
      setResendOtp(resendOtp + 1);
      localStorage.setItem("resendOtp", resendOtp);
    })
    .catch((error) => {
      console.log(error);
      setLoading(false);
    });
}

// when user have to verify OTP
function onOTPVerify(e) {
  e.preventDefault();
  setLoading(true);
  window.confirmationResult
    .confirm(otp)
    .then(async (res) => {
      setLoading(false);
      const resp = await axios.post("/api/user/verify-mobile", {
        email: user?.email,
        mobile: ph,
      });
      if (resp.data.success) {
        message.success(resp.data.message);
        dispatch(setUser(resp.data.data));
        getUserData();
      }
    })
    .catch((err) => {
      console.log(err);
      setLoading(false);
    });
}
// ============================= FIREBASE OTP =============================

import { useState, useEffect } from "react";

export function useDeviceMode() {
  const [deviceMode, setDeviceModeState] = useState(() => {
    return localStorage.getItem("pollx_device_mode") || "auto";
  });

  const checkIsMobileScreen = () => {
    if (typeof window === "undefined") return false;
    const isNarrow = window.innerWidth <= 768;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    return isNarrow || (isMobileUA && hasTouch);
  };

  const [isScreenMobile, setIsScreenMobile] = useState(checkIsMobileScreen);

  useEffect(() => {
    const handleResize = () => {
      setIsScreenMobile(checkIsMobileScreen());
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleMediaChange = (e) => {
      setIsScreenMobile(e.matches || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      }
    };
  }, []);

  const setDeviceMode = (mode) => {
    setDeviceModeState(mode);
    if (mode === "auto") {
      localStorage.removeItem("pollx_device_mode");
    } else {
      localStorage.setItem("pollx_device_mode", mode);
    }
  };

  // Determine effective mobile status:
  const isMobile =
    deviceMode === "mobile"
      ? true
      : deviceMode === "desktop"
      ? false
      : isScreenMobile;

  return {
    isMobile,
    deviceMode,
    setDeviceMode,
    isTouchDevice: typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0),
  };
}

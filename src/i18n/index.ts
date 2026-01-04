import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enNavbar from "./en/navbar.json";
import enHeroSection from "./en/herosection.json";
import enStats from "./en/stats.json";
import enFeatures from "./en/features.json";
import enCTA from "./en/cta.json";
import enFooter from "./en/footer.json";
import enLogin from "./en/login.json";
import enRegister from "./en/register.json";
import enAdminDashboard from "./en/adminDashboard.json";
import enUsersManagement from "./en/usersManagement.json";


import frNavbar from "./fr/navbar.json";
import frHeroSection from "./fr/herosection.json";
import frStats from "./fr/stats.json";
import frFeatures from "./fr/features.json";
import frCTA from "./fr/cta.json";
import frFooter from "./fr/footer.json";
import frLogin from "./fr/login.json";
import frRegister from "./fr/register.json";
import frAdminDashboard from "./fr/adminDashboard.json";
import fnUsersManagement from "./fr/usersManagement.json";


const lang = localStorage.getItem("lang") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: {
      navbar: enNavbar,
      heroSection: enHeroSection,
      stats: enStats,
      features: enFeatures,
      cta: enCTA,
      footer: enFooter,
      login: enLogin,
      register: enRegister,
      adminDashboard: enAdminDashboard,
      usersManagement: enUsersManagement
    },
    fr: {
      navbar: frNavbar,
      heroSection: frHeroSection,
      stats: frStats,
      features: frFeatures,
      cta: frCTA,
      footer: frFooter,
      login: frLogin,
      register: frRegister,
      adminDashboard: frAdminDashboard,
      usersManagement: fnUsersManagement
    }
  },
  lng: lang,
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});

export default i18n;

import Icon from "./Icon.jsx";
import "./AdvisorFooter.css";
import { Link } from "react-router-dom";

export default function AdvisorFooter() {
  return (
    <footer className="adf">
      <div className="adf__left">
        <span className="adf__copy">© 2024 REIFGO AI Advisors</span>
        <Link to="/privacy" className="adf__link">Privacy Protocol</Link>
        <Link to="/terms" className="adf__link">Terms of Service</Link>
      </div>
      <div className="adf__hq">
        <Icon name="building" size={11} />
        <span>London HQ: 124 City Road, EC1V 2NX</span>
      </div>
    </footer>
  );
}

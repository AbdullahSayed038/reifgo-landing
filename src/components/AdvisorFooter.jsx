import Icon from "./Icon.jsx";
import "./AdvisorFooter.css";

export default function AdvisorFooter() {
  return (
    <footer className="adf">
      <div className="adf__left">
        <span className="adf__copy">© 2024 REIFGO AI Advisors</span>
        <a href="#" className="adf__link">Privacy Protocol</a>
        <a href="#" className="adf__link">Terms of Service</a>
      </div>
      <div className="adf__hq">
        <Icon name="building" size={11} />
        <span>London HQ: 124 City Road, EC1V 2NX</span>
      </div>
    </footer>
  );
}

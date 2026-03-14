import ernieLogo from '@app/assets/ernie-logo.png';
import { Link } from 'react-router-dom';

import './Logo.css';

export default function Logo() {
  return (
    <Link to="/" className="inline-flex items-center px-2 py-1 no-underline perspective-[2000px]">
      <img
        src={ernieLogo}
        alt="ERNIE Logo"
        className="logo-icon w-[28px] h-[28px] rounded-md transition-all duration-1000 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]"
      />
      <span className="logo-text font-['Inter',sans-serif] font-semibold text-base text-foreground tracking-[0.02em] ml-2 transition-all duration-300">
        ERNIE Eval
      </span>
    </Link>
  );
}

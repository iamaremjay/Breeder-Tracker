import React from 'react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-bottom">
                <p>&copy; {currentYear} Bloodline Tracker. All rights reserved.</p>
                <p style={{ marginTop: '10px', fontSize: '13px' }}>
                    Developed By: MDS Software Development Services
                </p>
                <p style={{ fontSize: '13px' }}>
                    <a href="mailto:mdstechservices.info@gmail.com" style={{ color: '#4a9eff', textDecoration: 'none' }}>
                        mdstechservices.info@gmail.com
                    </a>
                </p>
            </div>
        </footer>
    );
};

export default Footer;
import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Link from '@mui/material/Link';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';
import Typography from '@mui/material/Typography';
import { responsiveFontSizes } from '@mui/material';
import styled from '@emotion/styled';


const Transition = React.forwardRef(function Transition(
  props,
  ref
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function TermsAndConditionsModal() {
  const styleText = {
    fontFamily: 'Calibri, Arial, sans-serif',
    textTransform: 'none',
    fontSize: '13px',
    marginTop: '8px'
  };
  const [open, setOpen] = React.useState(false);
  const [scroll, setScroll] = React.useState('paper');


  const handleClickOpen = (scrollType) => () => {
    setOpen(true);
    setScroll(scrollType);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const descriptionElementRef = React.useRef(null);
  React.useEffect(() => {
    if (open) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
  }, [open]);

  return (
    <>
      <Button
        variant="text"
        sx={{

          textAlign: 'center',
          margin: '4px auto',
          color: "black",
          fontFamily: 'Calibri, Arial, sans-serif',
          textTransform: 'none',
          textDecoration: 'underline', // Add underline
          fontSize: '16px', // Adjust font size
          cursor: 'pointer',
        }}
        onClick={handleClickOpen('paper')}>
        Terms & Conditions
      </Button>
      <Dialog
        open={open}
        TransitionComponent={Transition}
        keepMounted
        scroll={scroll}
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogTitle>{" TERMS OF SERVICE AGREEMENT"}</DialogTitle>
        <DialogContent>
          <DialogContentText
            id="alert-dialog-slide-description"
            ref={descriptionElementRef}
            tabIndex={-1}
          >
            <Typography
              variant="body1"
              display="block"
              gutterBottom
              style={styleText}>
              LAST REVISION: 23-Aug-2023 <br /><br />
              PLEASE READ THIS TERMS OF SERVICE AGREEMENT CAREFULLY. BY USING THIS WEBSITE OR DOWNLOADING INFORMATION FROM THIS WEBSITE YOU AGREE TO BE BOUND BY ALL OF THE TERMS AND CONDITIONS OF THIS AGREEMENT.
            </Typography>
            <Typography
              variant="body1"
              display="block"
              gutterBottom
              style={styleText}>
              This Terms of Service Agreement (the &quot;Agreement&quot;) governs your use of this website, www.airlineplan.com (the &quot;Website&quot;), Aerosphere Aviation Business Solutions Private Limited (&quot;AABS&quot;) offer of business information for purchase on this Website, or your purchase of business information available on this Website. This Agreement includes, and incorporates by this reference, the policies and guidelines referenced below. AABS reserves the right to change or revise the terms and conditions of this Agreement at any time by posting any changes or a revised Agreement on this Website. AABS will alert you that changes or revisions have been made by indicating on the top of this Agreement the date it was last revised. The changed or revised Agreement will be effective immediately after it is posted on this Website. Your use of the Website following the posting any such changes or of a revised Agreement will constitute your acceptance of any such changes or revisions. AABS encourages you to review this Agreement whenever you visit the Website to make sure that you understand the terms and conditions governing use of the Website. This Agreement does not alter in any way the terms or conditions of any other written agreement you may have with AABS for other products or services. If you do not agree to this Agreement (including any referenced policies or guidelines), please immediately terminate your use of the Website.
            </Typography> <br />
            <Typography
              variant="h6">
              <strong>
                I. Business Information
              </strong>
            </Typography>
            <Typography
              variant="body1"
              display="block"
              gutterBottom
              style={styleText}>
              <strong>Terms of Offer</strong> This Website offers for sale certain Business Information (the &quot;Products&quot;). By registering your account on this Website, you agree to the terms set forth in this Agreement.
              <br /><br />
              <strong>Customer Solicitation</strong> Unless you notify AABS, while being contacted, of your desire to opt out from further direct company communications and solicitations, you are agreeing to continue to receive further emails and call solicitations by AABS.
              <br /><br />
              <strong>Opt Out Procedure</strong> To opt out of all future solicitations you may send a written remove request to admin@airlineplan.com.
              Proprietary Rights AABS has rights to all trademarks and copyright on specific layouts of all the web pages, including calls to action, text placement, images and other information in www.airlineplan.com.
            </Typography>

            <br />
            <Typography variant="h6">
              <strong>
                II. WEBSITE
              </strong>
            </Typography>
            <Typography
              variant="body1"
              display="block"
              gutterBottom
              style={styleText}>
              <strong>Content</strong> AABS does not always create the information offered on this Website; instead the information is based on inputs from the user(s) of this Website. To the extent that AABS does create the content on this Website, such content is protected by intellectual property laws of the India, foreign nations, and international bodies.
              <br /><br />
              <strong>User Data</strong> All data directly entered by an user, except for account related information necessary for account registration (the &quot;Account data&quot;), as well as all data calculated from the data directly input by the user(s) are the sole property of that particular user. AABS shall not access, disseminate or use any such user related data, except for Account data, either directly input or derived from calculation steps, for any purpose, unless written authorization for access, update and transmission. All data pertaining to a user account, including the Account data, shall not be accessible or visible to any other user account.
              <br /><br />
              <strong>Use of Website</strong> AABS is not responsible for any damages resulting from use of this website by anyone. You will not use the Website for illegal purposes. You will (1) abide by all applicable local, state, national, and international laws and regulations in your use of the Website (including laws regarding intellectual property), (2) not interfere with or disrupt the use and enjoyment of the Website by other users, (3) not engage, directly or indirectly, in transmission of &quot;spam&quot;, chain letters, junk mail or any other type of unsolicited communication, and (4) not defame, harass, abuse, or disrupt other users of the Website.
              <br /><br />
              AABS does not have the oversight or the ability to control the user input and processed output in the Website. You are solely responsible for any content you input and the accuracy, suitability and fitness of purpose of the Products you extract from the Website. AABS reserves the right, but has no obligation, to monitor usage activity statistics of the Website, including total data and processing resources used by one or more user account(s). AABS reserves the right, but has no obligation, to remove any content or suspend or terminate any user account AABS deems objectionable, at AABS&apos;s sole discretion.
              <br /><br />
              <strong>License</strong> By using this Website, you are granted a limited, non-exclusive, non-transferable right to use the content and materials on the Website in connection with your normal use of the Website.
            </Typography>
            <br />
            <Typography variant="h6">
              <strong>
                III. DISCLAIMER OF WARRANTIES
              </strong>
              <br />
            </Typography>
            <Typography
              variant="body1"
              display="block"
              gutterBottom
              style={styleText}>
              Your use of this Website and/or the Products are at your sole risk. AABS expressly disclaims all warranties of any kind, whether express or implied. No advice or information, whether oral or written, obtained by you from this website, including email communications, will create any warranty not expressly stated herein.
              Without limiting the generality of the foregoing, AABS makes no warranty:
              <ul style={{ marginLeft: "1rem" }}>
                <li>
                  That the information provided on this Website is accurate, reliable, complete or timely
                </li>
                <li>
                  Regarding any products obtained through this Website
                </li>
              </ul>
            </Typography>
            <br />
            <Typography variant="h6">
              <strong>
                IV. LIMITATION OF LIABILITY
              </strong>
            </Typography>
            <Typography
              variant="body1"
              display="block"
              gutterBottom
              style={styleText}>
              AABS’ entire liability, and your exclusive remedy, in law, in equity, or otherwise, with respect to the website content and products and/or for any breach of this agreement is zero/nil.
            </Typography>
            <br />
            <Typography variant="h6">
              <strong>
                V. INDEMNIFICATION
              </strong>
            </Typography>
            <Typography
              variant="body1"
              display="block"
              gutterBottom
              style={styleText}>
              You will release, indemnify, defend and hold harmless AABS, and any of its contractors, employees, officers, directors, shareholders, affiliates and assigns from all liabilities, claims, damages, costs and expenses, relating to or arising out of (1) this Agreement or the breach of your warranties, representations and obligations under this Agreement; (2) the Website content or your use of the Website content; (3) the Products or your use of the Products; (4) any intellectual property or other proprietary right of any person or entity; (5) your violation of any provision of this Agreement; or (6) any information or data you supplied to AABS. The terms of this provision will survive any termination or cancellation of this Agreement or your use of the Website or Products.
            </Typography>
            <br />
            <Typography variant="h6">
              <strong>
                VI. AGREEMENT TO BE BOUND
              </strong>
            </Typography>
            <Typography
              variant="body1"
              display="block"
              gutterBottom
              style={styleText}>
              By using this Website or Products, you acknowledge that you have read and agree to be bound by this Agreement and all terms and conditions on this Website.
            </Typography>
            <br />
            <Typography variant="h6">
              <strong>
                VIII. GENERAL
              </strong>
            </Typography>
            <Typography
              variant="body1"
              display="block"
              gutterBottom
              style={styleText}>
              <strong>Force Majeure</strong> AABS will not be deemed in default hereunder or held responsible for any cessation, interruption or delay in the performance of its obligations hereunder due to earthquake, flood, fire, storm, natural disaster, act of God, war, terrorism, armed conflict, labor strike, lockout, or boycott.
              <br /><br /><strong>Cessation of Operation</strong> AABS may at any time, in its sole discretion and without advance notice to you, cease operation of the Website and availability of the Products.
              <br /><br /><strong>Entire Agreement</strong> This Agreement comprises the entire agreement between you and AABS and supersedes any prior agreements pertaining to the subject matter contained herein.
              <br /><br /><strong>Effect of Waiver</strong> The failure of AABS to exercise or enforce any right or provision of this Agreement will not constitute a waiver of such right or provision. If any provision of this Agreement is found by a court of competent jurisdiction to be invalid, the parties nevertheless agree that the court should endeavor to give effect to the parties' intentions as reflected in the provision, and the other provisions of this Agreement remain in full force and effect.
              <br /><br /><strong>Governing Law & Jurisdiction</strong> This Website originates from Noida, Uttar Pradesh, India. This Agreement will be governed by the laws of India. Neither you nor AABS will commence or prosecute any suit, proceeding or claim to enforce the provisions of this Agreement, to recover damages for breach of or default of this Agreement, or otherwise arising under or by reason of this Agreement, other than in courts located in State of Uttar Pradesh. By using this Website or Products, you consent to the jurisdiction and venue of such courts in connection with any action, suit, proceeding or claim arising under or by reason of this Agreement.
              <br /><br /><strong>Statute of Limitation</strong> You agree that regardless of any statute or law to the contrary, any claim or cause of action arising out of or related to use of the Website or Products or this Agreement must be filed within six (6) months after such claim or cause of action arose or be forever barred.
              <br /><br /><strong>Termination</strong> AABS reserves the right to terminate your access to the Website if it reasonably believes, in its sole discretion, that you have breached any of the terms and conditions of this Agreement. Following termination, you will not be permitted to use the Website and AABS may, in its sole discretion either partially or fully, refund the remaining balance of your account. If your access to the Website is terminated, AABS reserves the right to exercise whatever means it deems necessary to prevent unauthorized access of the Website. This Agreement will survive indefinitely unless and until AABS chooses, in its sole discretion and without advance notice to you, to terminate it.
              <br /><br />BY USING THIS WEBSITE OR ORDERING PRODUCTS FROM THIS WEBSITE YOU AGREE TO BE BOUND BY ALL OF THE TERMS AND CONDITIONS OF THIS AGREEMENT.
            </Typography>
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </>
  );
}

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const qrcode = require('qrcode');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');

// @desc    Generate Printable PDF ID Card
// @route   GET /api/users/:id/card/pdf
// @access  Private (Owner or Admin)
router.get('/:id/card/pdf', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) {
      res.status(404);
      throw new Error('User not found');
    }

    // Authorization: Owner or Admin/Superadmin
    if (req.user.role === 'user' && !req.user._id.equals(user._id)) {
      res.status(403);
      throw new Error('Access denied. You can only print your own ID card.');
    }

    // If Admin, ensure operations admin isn't trying to download superadmin or other admin cards
    if (req.user.role === 'admin') {
      if (user.role === 'superadmin') {
        res.status(403);
        throw new Error('Access denied. Operations Admins cannot view Super Admin ID cards.');
      }
      if (user.role === 'admin' && !req.user._id.equals(user._id)) {
        res.status(403);
        throw new Error('Access denied. Operations Admins cannot view other Admin ID cards.');
      }
    }

    // Log the action
    await ActivityLog.create({
      userId: req.user._id,
      action: 'print_card',
      description: `Generated printable PDF ID card for ${user.name} (${user.email})`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    // Generate Verification URL
    // Point to port 3002 (traveler portal) for verification page or back-end API.
    // The requirement says: verification URL: http://localhost:3002/verify-card?id=[userId]
    const verificationUrl = `http://localhost:3002/verify-card?id=${user._id}`;
    
    // Generate QR Code Buffer
    const qrBuffer = await qrcode.toBuffer(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff'
      }
    });

    // Create PDF Document (standard badge size: 450 width x 280 height)
    const doc = new PDFDocument({
      size: [450, 280],
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="skywave_id_card_${user.employeeId || user.memberId || 'user'}.pdf"`);

    // Stream PDF directly to response
    doc.pipe(res);

    // DRAW CARD BACKGROUND & STYLING
    
    // Base Slate 900 Header
    doc.rect(0, 0, 450, 65).fill('#0f172a');

    // Accent line (Gold/Orange #f59e0b)
    doc.rect(0, 65, 450, 6).fill('#f59e0b');

    // Body background (Sleek light slate #f8fafc)
    doc.rect(0, 71, 450, 209).fill('#f8fafc');

    // Border around the card
    doc.rect(1, 1, 448, 278).lineWidth(2).stroke('#0f172a');

    // HEADER TEXT
    doc.fillColor('#ffffff');
    doc.font('Helvetica-Bold').fontSize(16).text('SKYWAVE AIRLINES', 25, 20);
    
    // Subheader
    doc.fillColor('#94a3b8'); // Slate 400
    doc.font('Helvetica-Bold').fontSize(8).text(
      user.role === 'user' ? 'FREQUENT FLYER MEMBER' : 'OPERATIONS CREW MEMBER', 
      25, 40
    );

    // PROFILE PICTURE / PLACEHOLDER
    const picX = 25;
    const picY = 90;
    const picW = 100;
    const picH = 120;

    // Draw picture border
    doc.rect(picX - 2, picY - 2, picW + 4, picH + 4).lineWidth(1.5).stroke('#cbd5e1');

    if (user.profilePicture && user.profilePicture.startsWith('data:image')) {
      try {
        const base64Data = user.profilePicture.replace(/^data:image\/\w+;base64,/, "");
        const imgBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imgBuffer, picX, picY, { width: picW, height: picH });
      } catch (err) {
        // Draw placeholder on error
        drawProfilePlaceholder(doc, picX, picY, picW, picH);
      }
    } else {
      drawProfilePlaceholder(doc, picX, picY, picW, picH);
    }

    // USER INFORMATION SECTION
    const infoX = 145;
    let currentY = 90;

    // User Name
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(16).text(user.name.toUpperCase(), infoX, currentY);
    currentY += 22;

    // Role / Title
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(10).text(
      `ROLE: ${user.role.toUpperCase()}`, 
      infoX, currentY
    );
    currentY += 16;

    // Member / Employee ID
    const displayId = user.employeeId || user.memberId || 'SW-MBR-PENDING';
    doc.fillColor('#475569').font('Helvetica').fontSize(10);
    doc.text('ID NUMBER:', infoX, currentY);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(displayId, infoX + 70, currentY);
    currentY += 16;

    // Membership tier or permissions count
    if (user.role === 'user') {
      doc.fillColor('#475569').font('Helvetica').fontSize(10);
      doc.text('TIER LEVEL:', infoX, currentY);
      doc.fillColor('#f59e0b').font('Helvetica-Bold').text(user.loyaltyTier.toUpperCase(), infoX + 70, currentY);
      currentY += 16;

      doc.fillColor('#475569').font('Helvetica').fontSize(10);
      doc.text('CLUB NO:', infoX, currentY);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(user.membershipNumber || 'N/A', infoX + 70, currentY);
    } else {
      doc.fillColor('#475569').font('Helvetica').fontSize(10);
      doc.text('DEPT/CRED:', infoX, currentY);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text('FLIGHT OPERATIONS', infoX + 70, currentY);
      currentY += 16;

      const permsText = user.permissions && user.permissions.length > 0
        ? `${user.permissions.length} SYSTEM AUTHS`
        : 'BASIC CREW ACCESS';
      doc.fillColor('#475569').font('Helvetica').fontSize(10);
      doc.text('ACCESS CLS:', infoX, currentY);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(permsText, infoX + 70, currentY);
    }
    currentY += 20;

    // Issue / Expiry dates
    const issueDate = new Date(user.createdAt || Date.now()).toLocaleDateString();
    const expiryDate = new Date(user.createdAt ? new Date(user.createdAt).setFullYear(new Date(user.createdAt).getFullYear() + 3) : Date.now() + 3 * 365 * 24 * 3600 * 1000).toLocaleDateString();
    
    doc.fillColor('#64748b').font('Helvetica').fontSize(8);
    doc.text(`ISSUED: ${issueDate}`, infoX, currentY);
    doc.text(`EXPIRES: ${expiryDate}`, infoX + 90, currentY);

    // QR CODE DISPLAY (Right side aligned)
    const qrX = 335;
    const qrY = 90;
    const qrSize = 90;

    // Draw QR code background/border
    doc.rect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4).lineWidth(1).stroke('#cbd5e1');
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    // Verify online badge
    doc.fillColor('#64748b').font('Helvetica').fontSize(6).text(
      'SCAN TO VERIFY CARD SECURITY', 
      qrX - 5, qrY + qrSize + 8, 
      { width: qrSize + 10, align: 'center' }
    );

    // CARD FOOTER
    doc.rect(0, 262, 450, 18).fill('#0f172a');
    doc.fillColor('#94a3b8').font('Helvetica-Bold').fontSize(6.5).text(
      'IF FOUND, PLEASE RETURN TO ANY SKYWAVE AIRLINES AIRPORT TERMINAL OR DESK. SECURE CARD NOT TRANSFERABLE.',
      25, 268
    );

    // Finalize PDF file
    doc.end();

  } catch (error) {
    next(error);
  }
});

// Helper to draw a profile picture placeholder
function drawProfilePlaceholder(doc, x, y, w, h) {
  // Fill light grey background
  doc.rect(x, y, w, h).fill('#e2e8f0');
  
  // Draw avatar head outline
  doc.circle(x + w/2, y + h/3 + 5, 22).fill('#94a3b8');
  
  // Draw avatar body curve
  // We can do this using lines and curves, or just an arc
  doc.path(`M ${x + 15} ${y + h - 10} C ${x + 20} ${y + h/2 + 25}, ${x + w - 20} ${y + h/2 + 25}, ${x + w - 15} ${y + h - 10} Z`).fill('#94a3b8');

  // Add "PHOTO" label
  doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('CREW PHOTO', x, y + h - 25, { width: w, align: 'center' });
}

// @desc    Verify Card QR Code URL
// @route   GET /api/users/:id/card/verify
// @access  Public
router.get('/:id/card/verify', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user || user.isDeleted) {
      return res.status(200).json({ 
        valid: false, 
        message: 'Security Card is invalid or has been revoked.' 
      });
    }

    if (user.status !== 'active') {
      return res.status(200).json({ 
        valid: false, 
        message: `Security Card is invalid. Account status is currently: ${user.status.toUpperCase()}.` 
      });
    }

    res.json({
      valid: true,
      user: {
        name: user.name,
        role: user.role,
        status: user.status,
        employeeId: user.employeeId || null,
        memberId: user.memberId || null,
        membershipNumber: user.membershipNumber || null,
        loyaltyTier: user.loyaltyTier || null,
        profilePicture: user.profilePicture || null,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

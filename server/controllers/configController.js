const SystemConfig = require('../models/SystemConfig');

// @desc    Get footer configurations (social links & branding)
// @route   GET /api/config/footer
// @access  Public
const getFooterConfig = async (req, res, next) => {
  try {
    const config = await SystemConfig.findOne({ key: 'footer_socials' });
    const defaults = {
      socialLinks: [
        { platform: 'whatsapp', url: '0774311051' },
        { platform: 'instagram', url: 'https://instagram.com/skywave' },
        { platform: 'x', url: 'https://x.com/skywave' },
        { platform: 'facebook', url: 'https://facebook.com/skywave' },
        { platform: 'tiktok', url: 'https://web.tiktok.com/skywave?_rdc=1&_rdr#' }
      ],
      isAlwaysOpen: false,
      address: '25st Lazarus road, Periyamulla, Negombo',
      phone: '+94 77 431 1051',
      email: 'support@skywave.com',
      branches: ['Colombo', 'Wattala', 'Negombo', 'Jaffna', 'Kandy'],
      workingHoursMonSat: '8:00 AM - 6:00 PM',
      workingHoursSun: 'Closed',
      mapUrl: 'https://maps.google.com/?q=25st+Lazarus+road,+Periyamulla,+Negombo',
      description: 'Your premium global aviation partner, delivering exceptional travel experiences with real-time seat locks and intelligent flight scoring.'
    };

    if (!config) {
      return res.json(defaults);
    }
    
    // Merge defaults with saved values in case some fields are missing
    res.json({ ...defaults, ...config.value });
  } catch (error) {
    next(error);
  }
};

// @desc    Update footer configurations
// @route   PUT /api/config/footer
// @access  Private (Super Admin Only)
const updateFooterConfig = async (req, res, next) => {
  try {
    const { 
      socialLinks, isAlwaysOpen, address, phone, email, 
      branches, workingHoursMonSat, workingHoursSun, mapUrl, description 
    } = req.body;
    
    let config = await SystemConfig.findOne({ key: 'footer_socials' });
    
    const value = {
      socialLinks: Array.isArray(socialLinks) ? socialLinks : [],
      isAlwaysOpen: !!isAlwaysOpen,
      address: address || '25st Lazarus road, Periyamulla, Negombo',
      phone: phone || '+94 77 431 1051',
      email: email || 'support@skywave.com',
      branches: Array.isArray(branches) ? branches : (branches ? branches.split(',').map(b => b.trim()) : []),
      workingHoursMonSat: workingHoursMonSat || '8:00 AM - 6:00 PM',
      workingHoursSun: workingHoursSun || 'Closed',
      mapUrl: mapUrl || 'https://maps.google.com/?q=25st+Lazarus+road,+Periyamulla,+Negombo',
      description: description || 'Your premium global aviation partner, delivering exceptional travel experiences with real-time seat locks and intelligent flight scoring.'
    };

    if (!config) {
      config = new SystemConfig({
        key: 'footer_socials',
        value
      });
    } else {
      config.value = value;
      config.markModified('value');
    }

    await config.save();
    res.json(config.value);
  } catch (error) {
    next(error);
  }
};

// @desc    Get homepage dynamic feature cards
// @route   GET /api/config/features
// @access  Public
const getFeaturesConfig = async (req, res, next) => {
  try {
    const config = await SystemConfig.findOne({ key: 'homepage_features' });
    const defaults = [
      {
        icon: '✨',
        title: 'AI Suggestion Engine',
        desc: 'Get recommended flight badges instantly based on duration, stops, layover times, and price balances.'
      },
      {
        icon: '🔒',
        title: 'Real-Time Seat Locks',
        desc: 'Lock your favorite window or aisle seat for up to 8 minutes while you enter traveler info. No double-bookings.'
      },
      {
        icon: '👑',
        title: 'Elite SkyWave Club',
        desc: 'Accumulate club rewards points automatically and advance through Bronze, Silver, Gold, and Platinum tiers.'
      }
    ];

    if (!config) {
      return res.json(defaults);
    }
    
    const savedVal = Array.isArray(config.value) ? config.value : [];
    const merged = defaults.map((def, idx) => {
      const saved = savedVal[idx] || {};
      return {
        icon: saved.icon || def.icon,
        title: saved.title || def.title,
        desc: saved.desc || def.desc
      };
    });

    res.json(merged);
  } catch (error) {
    next(error);
  }
};

// @desc    Update homepage dynamic feature cards
// @route   PUT /api/config/features
// @access  Private (Super Admin Only)
const updateFeaturesConfig = async (req, res, next) => {
  try {
    const { features } = req.body;
    
    if (!Array.isArray(features) || features.length !== 3) {
      res.status(400);
      throw new Error('Features configuration must be an array of exactly 3 feature cards');
    }

    let config = await SystemConfig.findOne({ key: 'homepage_features' });
    
    const value = features.map(f => ({
      icon: f.icon || '✨',
      title: f.title || '',
      desc: f.desc || ''
    }));

    if (!config) {
      config = new SystemConfig({
        key: 'homepage_features',
        value
      });
    } else {
      config.value = value;
      config.markModified('value');
    }

    await config.save();
    res.json(config.value);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFooterConfig,
  updateFooterConfig,
  getFeaturesConfig,
  updateFeaturesConfig
};

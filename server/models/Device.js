const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  deviceKey: {
    type: String,
    required: true,
    select: false
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: null
  },
  systemInfo: {
    hostname: String,
    platform: String,
    arch: String,
    version: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Device', deviceSchema);

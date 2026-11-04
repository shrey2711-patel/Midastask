const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: 250
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
    index: true
  },
  dueDate: {
    type: Date,
    default: null,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

taskSchema.index({ deviceId: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);

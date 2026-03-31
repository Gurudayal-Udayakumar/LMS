require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../src/config/env');

// Import all models
const User = require('../src/models/User');
const Appointment = require('../src/models/Appointment');
const Ticket = require('../src/models/Ticket');
const TicketMessage = require('../src/models/TicketMessage');
const Task = require('../src/models/Task');
const TaskSubmission = require('../src/models/TaskSubmission');
const ChatRoom = require('../src/models/ChatRoom');
const ChatRoomMember = require('../src/models/ChatRoomMember');
const ChatMessage = require('../src/models/ChatMessage');
const JobPost = require('../src/models/JobPost');
const JobApplication = require('../src/models/JobApplication');
const Notification = require('../src/models/Notification');

async function main() {
  await mongoose.connect(config.mongoUri);
  console.log('🌱 Seeding database...\n');

  // Clear existing data (order matters for references)
  await Notification.deleteMany({});
  await ChatMessage.deleteMany({});
  await ChatRoomMember.deleteMany({});
  await ChatRoom.deleteMany({});
  await JobApplication.deleteMany({});
  await JobPost.deleteMany({});
  await TaskSubmission.deleteMany({});
  await Task.deleteMany({});
  await TicketMessage.deleteMany({});
  await Ticket.deleteMany({});
  await Appointment.deleteMany({});
  await User.deleteMany({});

  const hash = await bcrypt.hash('password123', 12);

  // Create Users
  const admin = await User.create({ email: 'admin@lms.com', passwordHash: hash, fullName: 'Admin User', role: 'admin', bio: 'Platform Administrator' });
  const mentor1 = await User.create({ email: 'mentor1@lms.com', passwordHash: hash, fullName: 'Dr. Sarah Chen', role: 'mentor', bio: 'Senior Software Engineer & Mentor', phone: '+1-555-0101' });
  const mentor2 = await User.create({ email: 'mentor2@lms.com', passwordHash: hash, fullName: 'Prof. James Wilson', role: 'mentor', bio: 'Full Stack Developer & Educator', phone: '+1-555-0102' });
  const student1 = await User.create({ email: 'student1@lms.com', passwordHash: hash, fullName: 'Alex Thompson', role: 'student', bio: 'Aspiring web developer', phone: '+1-555-0201' });
  const student2 = await User.create({ email: 'student2@lms.com', passwordHash: hash, fullName: 'Priya Sharma', role: 'student', bio: 'Computer Science student', phone: '+1-555-0202' });
  const student3 = await User.create({ email: 'student3@lms.com', passwordHash: hash, fullName: 'Mike Johnson', role: 'student', bio: 'Learning to code', phone: '+1-555-0203' });
  console.log('✅ Users created');

  // Create Appointments
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  await Appointment.insertMany([
    { studentId: student1._id, mentorId: mentor1._id, title: 'React Fundamentals Review', description: 'Review React hooks and state management', scheduledAt: new Date(nextWeek.setHours(10, 0, 0)), durationMin: 45, status: 'confirmed', meetingLink: 'https://meet.google.com/abc-defg-hij' },
    { studentId: student2._id, mentorId: mentor1._id, title: 'Career Guidance Session', description: 'Discuss career paths in software development', scheduledAt: new Date(nextWeek.setHours(14, 0, 0)), durationMin: 30, status: 'pending' },
    { studentId: student1._id, mentorId: mentor2._id, title: 'Database Design Help', description: 'Need help with relational database design', scheduledAt: new Date(nextWeek.setHours(16, 0, 0)), durationMin: 60, status: 'pending' },
  ]);
  console.log('✅ Appointments created');

  // Create Tickets
  const ticket1 = await Ticket.create({ studentId: student1._id, assignedTo: mentor1._id, title: 'Cannot access course materials', description: 'Getting a 403 error when trying to access the Node.js course materials.', category: 'technical', priority: 'high', status: 'in_progress' });
  await Ticket.create({ studentId: student2._id, title: 'Doubt in JavaScript Closures', description: 'I am confused about how closures work in JavaScript, especially with loops.', category: 'academic', priority: 'medium', status: 'open' });
  await TicketMessage.insertMany([
    { ticketId: ticket1._id, senderId: student1._id, message: 'I keep getting a 403 Forbidden error when I click on the course materials link.' },
    { ticketId: ticket1._id, senderId: mentor1._id, message: 'Let me check your access permissions. Can you try clearing your browser cache first?' },
    { ticketId: ticket1._id, senderId: student1._id, message: 'I tried clearing the cache but still getting the same error.' },
  ]);
  console.log('✅ Tickets created');

  // Create Tasks
  const task1 = await Task.create({ createdBy: mentor1._id, title: 'Build a REST API', description: 'Create a RESTful API for a todo application using Express.js and MongoDB.', instructions: '1. Set up Express server\n2. Create CRUD endpoints\n3. Add input validation\n4. Write basic tests', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), maxScore: 100, status: 'published' });
  await Task.create({ createdBy: mentor2._id, title: 'React Dashboard Component', description: 'Design and implement a responsive dashboard component using React and CSS.', instructions: '1. Create a dashboard layout\n2. Add stat cards\n3. Implement a chart component\n4. Make it responsive', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), maxScore: 100, status: 'published' });
  await Task.create({ createdBy: mentor1._id, title: 'Database Schema Design', description: 'Design database schema for an e-commerce application.', instructions: 'Create ERD and SQL scripts for Products, Orders, Users, and Reviews tables.', dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), maxScore: 80, status: 'draft' });
  console.log('✅ Tasks created');

  // Create Job Posts
  await JobPost.insertMany([
    { postedBy: admin._id, title: 'Junior Frontend Developer', company: 'TechCorp Inc.', location: 'Bangalore, India', type: 'full_time', description: 'Looking for a passionate junior frontend developer with React experience.', requirements: 'HTML, CSS, JavaScript, React, 0-2 years experience', salaryRange: '₹4L - ₹8L per annum', deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    { postedBy: admin._id, title: 'Node.js Backend Intern', company: 'StartupXYZ', location: 'Remote', type: 'internship', description: 'Join our backend team and work on building scalable APIs.', requirements: 'Node.js, Express, SQL basics, Git', salaryRange: '₹15K - ₹25K per month', deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
    { postedBy: mentor1._id, title: 'Full Stack Developer', company: 'Digital Solutions Ltd.', location: 'Hyderabad, India', type: 'full_time', description: 'Seeking a full stack developer to work on our SaaS platform.', requirements: 'React, Node.js, PostgreSQL, Docker, 2-4 years experience', salaryRange: '₹10L - ₹18L per annum', deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) },
  ]);
  console.log('✅ Job posts created');

  // Create Chat Room (group)
  const chatRoom = await ChatRoom.create({ type: 'group', name: 'General Discussion' });
  await ChatRoomMember.insertMany([
    { roomId: chatRoom._id, userId: student1._id },
    { roomId: chatRoom._id, userId: student2._id },
    { roomId: chatRoom._id, userId: mentor1._id },
  ]);
  await ChatMessage.insertMany([
    { roomId: chatRoom._id, senderId: mentor1._id, content: 'Welcome to the LMS general chat! Feel free to ask questions here.' },
    { roomId: chatRoom._id, senderId: student1._id, content: 'Thanks! Excited to be here.' },
    { roomId: chatRoom._id, senderId: student2._id, content: 'Hello everyone! 👋' },
  ]);

  // Direct chat
  const directRoom = await ChatRoom.create({ type: 'direct' });
  await ChatRoomMember.insertMany([
    { roomId: directRoom._id, userId: student1._id },
    { roomId: directRoom._id, userId: mentor1._id },
  ]);
  await ChatMessage.insertMany([
    { roomId: directRoom._id, senderId: student1._id, content: 'Hi Dr. Chen, I had a question about the assignment.' },
    { roomId: directRoom._id, senderId: mentor1._id, content: 'Sure, go ahead! What do you need help with?' },
  ]);
  console.log('✅ Chat rooms created');

  console.log('\n🎉 Seed complete!\n');
  console.log('Demo Accounts (password: password123):');
  console.log('  Admin:   admin@lms.com');
  console.log('  Mentor:  mentor1@lms.com / mentor2@lms.com');
  console.log('  Student: student1@lms.com / student2@lms.com / student3@lms.com\n');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await mongoose.disconnect(); });

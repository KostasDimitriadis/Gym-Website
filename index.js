const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

mongoose.connect('mongodb://localhost:27017/gymdb', { useNewUrlParser: true, useUnifiedTopology: true });
const session = require('express-session');

app.use(session({
  secret: 'key', 
  resave: false,
  saveUninitialized: true,
}));


const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    name: String,
    surname: String,
    country: String,
    city: String,
    address: String,
    telephone: String,
    registrationStatus: {
        type: String,
        enum: ['pending', 'approved', 'denied'],
        default: 'pending',
    },
    role: {
        type: String,
        default: 'user',
        enum: ['user', 'admin'],
    },
});

const User = mongoose.model('User', userSchema, 'Users');

const announcementSchema = new mongoose.Schema({
  title: String,
  content: String,
});

const Announcement = mongoose.model('Announcement', announcementSchema, 'Announcements');


const trainerSchema = new mongoose.Schema({
  name: String,
  expertise: String,
});

const Trainer= mongoose.model('Trainer', trainerSchema, 'Trainers');


const programSchema = new mongoose.Schema({
  name: {
      type: String,
      required: true,
  },
});


const Program = mongoose.model('Program', programSchema, 'Programs');


const scheduleSchema = new mongoose.Schema({
  programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
  },
  day: {
      type: String,
      required: true,
  },
  time: {
      type: String,
      required: true,
  },
  trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
  },
  maxCapacity: {
      type: Number,
      required: true,
  },

});


const Schedule = mongoose.model('Schedule', scheduleSchema, 'Schedules');



const reservationSchema = new mongoose.Schema({
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

const Reservation = mongoose.model('Reservation', reservationSchema, 'Reservations');


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('homepage');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login/', (req, res) => {
    res.render('login');
});


app.get('/admin/dashboard', (req, res) => {
  res.render('admin-dashboard');
});


app.get('/admin/manage-registration-requests', async (req, res) => {
  try {
      const registrationRequests = await User.find({ registrationStatus: 'pending' });
      res.render('admin-manage-registration-requests', { registrationRequests });
  } catch (error) {
      console.error('Error fetching registration requests:', error.message);
      res.status(500).send('Internal Server Error');
  }


});
app.get('/admin/manage-users', async (req, res) => {
  try {
      const users = await User.find();
      res.render('admin-manage-users', { users });
  } catch (error) {
      console.error('Error fetching users:', error.message);
      res.status(500).send('Internal Server Error');
  }
});

// Read operation (View user details )
app.get('/admin/view-user/:userId',async (req, res) => {
  const { userId } = req.params;

  try {
      // Find the user by userId
      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).send('User not found');
      }

      
      res.render('admin-view-user', { user });
  } catch (error) {
      console.error('Error fetching user details:', error.message);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/admin/create-announcement', (req, res) => {
  res.render('admin-create-announcement');
});


app.get('/admin/manage-announcements', async (req, res) => {
  try {
      const announcements = await Announcement.find();
      res.render('admin-manage-announcements', { announcements });
  } catch (error) {
      console.error('Error fetching announcements:', error.message);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/admin/manage-trainers', async (req, res) => {
  try {
      const trainers = await Trainer.find();
      res.render('admin-manage-trainers', { trainers });
  } catch (error) {
      console.error('Error fetching trainers:', error.message);
      res.status(500).send('Internal Server Error');
  }
});


app.get('/admin/manage-programs', async (req, res) => {
  try {
      const programs = await Program.find();
      res.render('admin-manage-programs', { programs });
  } catch (error) {
      console.error('Error fetching programs:', error.message);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/admin/manage-schedules', async (req, res) => {
  try {
      // Fetch all schedules and populate the associated program and trainer information
      const schedules = await Schedule.find().populate('programId').populate('trainerId');

      // Fetch programs from the database
      const programs = await Program.find();

      // Fetch trainers from the database
      const trainers = await Trainer.find();


      res.render('admin-manage-schedules', { schedules, programs, trainers });
  } catch (error) {
      console.error('Error fetching schedules:', error.message);
      res.status(500).send('Internal Server Error');
  }
});
app.get('/admin/edit-schedule/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await Schedule.findById(scheduleId).populate('programId').populate('trainerId');

    if (!schedule) {
      return res.status(404).send('Schedule not found');
    }

    const programs = await Program.find();
    const trainers = await Trainer.find();

    res.render('admin-edit-schedule', { schedule, programs, trainers });
  } catch (error) {
    console.error('Error fetching schedule for editing:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/functions',async (req, res) => {
  try {
    res.render('functions');
  } catch (error) {
    console.error('Error handling /functions:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
      // If logged in, proceed
      return next();
    }
  
    // If not logged in, redirect to the login page
    res.redirect('/login');
  };
  
  // Render reservation page
  app.get('/reservation', isAuthenticated, async (req, res) => {
    try {
      const schedules = await Schedule.find().populate('programId').populate('trainerId');
      res.render('reservation', { schedules });
    } catch (error) {
      console.error('Error handling /reservation GET:', error.message);
      res.status(500).send('Internal Server Error');
    }
  });


  app.get('/user/reservations', isAuthenticated, async (req, res) => {
    try {
      // Find all reservations for the current user
      const userReservations = await Reservation.find({ userId: req.session.user._id }).populate('scheduleId');
  
      res.render('user-reservations', { userReservations });
    } catch (error) {
      console.error('Error fetching user reservations:', error.message);
      res.status(500).send('Internal Server Error');
    }
  });


app.get('/announcements', async (req, res) => {
  try {
      const announcements = await Announcement.find();
      res.render('announcements', { announcements });
  } catch (error) {
      console.error('Error fetching announcements:', error.message);
      res.status(500).send('Internal Server Error');
  }
});





app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && bcrypt.compareSync(password, user.password)) {
      if (user.username === 'admin' && password === 'admin') {
        console.log('Admin login successful. Redirecting to admin dashboard.');
        req.session.user = user; // Set the session user
        return res.redirect('/admin/dashboard');
      } else if (user.role === 'admin') {
        console.log('Admin login successful. Redirecting to admin dashboard.');
        req.session.user = user; // Set the session user
        return res.redirect('/admin/dashboard');
      } else {
        console.log('Regular user login successful. Redirecting to functions.');
        // Set the session user for regular users
        req.session.user = user;
        // Redirect to /functions for regular users
        return res.redirect('/functions');
      }
    }

    console.log('Login failed. Redirecting back to login page.');
    res.redirect('/login');
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/register', async (req, res) => {
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);

    const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
        name: req.body.name,
        surname: req.body.surname,
        country: req.body.country,
        city: req.body.city,
        address: req.body.address,
        telephone: req.body.telephone,
        registrationStatus: 'pending',
        role: req.body.username === 'admin' && req.body.password === 'admin' ? 'admin' : 'user',
    });

    try {
        await newUser.save();

        if (newUser.registrationStatus === 'approved') {
            return res.redirect(`/login/${newUser._id}`);
        } else {
            res.render('login')
        }
    } catch (error) {
        console.error(error);
        res.send('Error occurred during registration.');
    }
});

app.post('/admin/manage-registration-requests', async (req, res) => {
  const { action, userId } = req.body;

  try {
      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).send('User not found');
      }

      if (action === 'approve') {
          // Update registrationStatus to 'approved'
          user.registrationStatus = 'approved';
          await user.save();
          console.log(`User ${user.username} approved.`);

          // Redirect to the manage-registration-requests page after approval
          const registrationRequests = await User.find({ registrationStatus: 'pending' });
          return res.render('admin-manage-registration-requests', { registrationRequests });
      } else if (action === 'reject') {
          // Delete user and redirect to the manage-registration-requests page after rejection
          await User.findByIdAndDelete(userId);
          console.log(`User ${user.username} rejected and deleted.`);
          
          const registrationRequests = await User.find({ registrationStatus: 'pending' });
          return res.render('admin-manage-registration-requests', { registrationRequests });
      } else {
          return res.status(400).send('Invalid action');
      }
  } catch (error) {
      console.error('Error handling registration requests action:', error.message);
      res.status(500).send('Internal Server Error');
  }
});




// CRUD operations for user management
app.post('/admin/manage-users', async (req, res) => {
  const { action, userId } = req.body;

  try {
    if (action === 'create') {
      // Extract user details from the form
      const {
        username,
        email,
        password,
        name,
        surname,
        country,
        city,
        address,
        telephone,
        registrationStatus,
        role
      } = req.body;

      // Create a new user
      const newUser = new User({
        username,
        email,
        password, 
        name,
        surname,
        country,
        city,
        address,
        telephone,
        registrationStatus,
        role
      });

      // Save the new user to the database
      await newUser.save();

    
      res.redirect('/admin/manage-users');
    } else if (action === 'update') {
      // Update user details
      const updatedUser = await User.findByIdAndUpdate(userId, {
        username: req.body.newUsername,
        email: req.body.newEmail,
        name: req.body.newName,
        surname: req.body.newSurname,
        country: req.body.newCountry,
        city: req.body.newCity,
        address: req.body.newAddress,
        telephone: req.body.newTelephone,
        registrationStatus: req.body.newRegistrationStatus,
        role: req.body.newRole
      }, { new: true });

      if (!updatedUser) {
        return res.status(404).send('User not found');
      }
    } else if (action === 'delete') {
      // Delete user
      const deletedUser = await User.findByIdAndDelete(userId);
      if (!deletedUser) {
        return res.status(404).send('User not found');
      }
    } else {
      return res.status(400).send('Invalid action');
    }

    // Fetch updated user list
    const users = await User.find();
    res.render('admin-manage-users', { users });
  } catch (error) {
    console.error('Error managing users:', error.message);
    res.status(500).send('Internal Server Error');
  }
});



app.post('/admin/view-user/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    // Extract updated user details from the form
    const {
      username,
      email,
      name,
      surname,
      country,
      city,
      address,
      telephone,
      registrationStatus,
      role
    } = req.body;

    // Update user details in the database
    const updatedUser = await User.findByIdAndUpdate(userId, {
      username,
      email,
      name,
      surname,
      country,
      city,
      address,
      telephone,
      registrationStatus,
      role
    }, { new: true });

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.redirect(`/admin/view-user/${userId}`);
  } catch (error) {
    console.error('Error updating user from admin view:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/admin/create-announcement', async (req, res) => {
  const { title, content } = req.body;

  try {
      // Create a new announcement instance
      const newAnnouncement = new Announcement({
          title,
          content,
      });

    
      await newAnnouncement.save();

      
      res.redirect('/admin/create-announcement'); 
  } catch (error) {
      console.error('Error creating announcement:', error.message);
      res.status(500).send('Internal Server Error');
  }
});


app.post('/admin/manage-announcements', async (req, res) => {
  const { action, announcementId, title, content } = req.body;

  try {
      if (action === 'delete' && announcementId) {
          // Delete announcement
          const deletedAnnouncement = await Announcement.findByIdAndDelete(announcementId);

          if (!deletedAnnouncement) {
              return res.status(404).send('Announcement not found');
          }

          // Redirect to the manage-announcements page after deletion
          const announcements = await Announcement.find();
          return res.render('admin-manage-announcements', { announcements });
      } else if (action === 'edit' && announcementId) {
          // Update announcement
          const updatedAnnouncement = await Announcement.findByIdAndUpdate(announcementId, {
              title,
              content,
          }, { new: true });

          if (!updatedAnnouncement) {
              return res.status(404).send('Announcement not found');
          }

          // Redirect to the manage-announcements page after editing
          const announcements = await Announcement.find();
          return res.render('admin-manage-announcements', { announcements });
      } else {
          // Handle other cases or show an error
          return res.status(400).send('Invalid action');
      }
  } catch (error) {
      console.error('Error handling manage announcements action:', error.message);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/admin/manage-trainers', async (req, res) => {
  const { action, trainerId, name, expertise, updateName, updateExpertise } = req.body;

  try {
      if (action === 'create') {
          // Create a new trainer
          const newTrainer = new Trainer({
              name,
              expertise,
          });

          // Save the new trainer to the database
          await newTrainer.save();
      } else if (action === 'update' && trainerId) {
          // Update trainer details
          const updatedTrainer = await Trainer.findByIdAndUpdate(trainerId, {
              name: updateName,
              expertise: updateExpertise,
          }, { new: true });

          if (!updatedTrainer) {
              return res.status(404).send('Trainer not found');
          }
      } else if (action === 'delete' && trainerId) {
          // Delete trainer
          await Trainer.findByIdAndDelete(trainerId);
      } else {
          return res.status(400).send('Invalid action');
      }

      // Fetch updated trainer list
      const trainers = await Trainer.find();
      res.render('admin-manage-trainers', { trainers });
  } catch (error) {
      console.error('Error managing trainers:', error.message);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/admin/manage-programs', async (req, res) => {
  const { action, programId, name, capacity, updateName, updateCapacity } = req.body;

  try {
      if (action === 'create') {
          // Create a new program
          const newProgram = new Program({
              name,
              capacity,
          });

          // Save the new program to the database
          await newProgram.save();
      } else if (action === 'update' && programId) {
          // Update program details
          const updatedProgram = await Program.findByIdAndUpdate(programId, {
              name: updateName,
              capacity: updateCapacity,
          }, { new: true });

          if (!updatedProgram) {
              return res.status(404).send('Program not found');
          }
      } else if (action === 'delete' && programId) {
          // Delete program
          await Program.findByIdAndDelete(programId);
      } else {
          return res.status(400).send('Invalid action');
      }

      // Fetch updated program list
      const programs = await Program.find();
      res.render('admin-manage-programs', { programs });
  } catch (error) {
      console.error('Error managing programs:', error.message);
      res.status(500).send('Internal Server Error');
  }
});

app.post('/admin/manage-schedules', async (req, res) => {
  const { action, scheduleId, programId, day, time, trainerId, maxCapacity, updateProgramId, updateDay, updateTime, updateTrainerId, updateMaxCapacity } = req.body;

  try {
      if (action === 'create') {
          // Create a new schedule
          const newSchedule = new Schedule({
              programId,
              day,
              time,
              trainerId,
              maxCapacity,
          });

          // Save the new schedule to the database
          await newSchedule.save();
      } else if (action === 'update' && scheduleId) {
          // Update schedule details
          const updatedSchedule = await Schedule.findByIdAndUpdate(scheduleId, {
              programId: updateProgramId,
              day: updateDay,
              time: updateTime,
              trainerId: updateTrainerId,
              maxCapacity: updateMaxCapacity,
          }, { new: true });

          if (!updatedSchedule) {
              return res.status(404).send('Schedule not found');
          }
      } else if (action === 'delete' && scheduleId) {
          // Delete schedule
          await Schedule.findByIdAndDelete(scheduleId);
      } else {
          return res.status(400).send('Invalid action');
      }

      // Fetch updated schedule list
      const schedules = await Schedule.find().populate('programId').populate('trainerId');
      const programs = await Program.find();
      const trainers = await Trainer.find();

      // Render the admin-manage-schedules.ejs file with the updated data
      res.render('admin-manage-schedules', { schedules, programs, trainers });
  } catch (error) {
      console.error('Error managing schedules:', error.message);
      res.status(500).send('Internal Server Error');
  }
});



app.post('/admin/manage-schedules', async (req, res) => {
  const { action, scheduleId, updateProgramId, updateDay, updateTime, updateTrainerId, updateMaxCapacity } = req.body;

  try {
    if (action === 'update' && scheduleId) {
      // Update schedule details
      const updatedSchedule = await Schedule.findByIdAndUpdate(scheduleId, {
        programId: updateProgramId,
        day: updateDay,
        time: updateTime,
        trainerId: updateTrainerId,
        maxCapacity: updateMaxCapacity,
      }, { new: true });

      if (!updatedSchedule) {
        return res.status(404).send('Schedule not found');
      }
    } else {
      return res.status(400).send('Invalid action');
    }

    // Fetch updated schedule list
    const schedules = await Schedule.find().populate('programId').populate('trainerId');
    const programs = await Program.find();
    const trainers = await Trainer.find();

    // Render the admin-manage-schedules.ejs file with the updated data
    res.render('admin-manage-schedules', { schedules, programs, trainers });
  } catch (error) {
    console.error('Error managing schedules:', error.message);
    res.status(500).send('Internal Server Error');
  }
});
app.post('/reservation', async (req, res) => {
  try {
    // Validate scheduleId
    const { scheduleId } = req.body;

    if (!scheduleId) {
      return res.status(400).send('Invalid schedule ID');
    }

    // Retrieve the selected schedule
    const selectedSchedule = await Schedule.findById(scheduleId).populate('programId').populate('trainerId');

    if (!selectedSchedule) {
      return res.status(404).send('Schedule not found');
    }

    // Create a reservation
    const reservation = new Reservation({
      scheduleId: selectedSchedule._id,
      userId: req.session.user._id,
    });

    // Save the reservation to the database
    await reservation.save();

    // Fetch updated schedule list
    const schedules = await Schedule.find().populate('programId').populate('trainerId');

    // Render the reservation.ejs file with the updated data
    return res.render('reservation', { schedules, reservationSuccess: true });
  } catch (error) {
    console.error('Error handling /reservation POST:', error.message);
    res.status(500).send('Internal Server Error');
  }
});



app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

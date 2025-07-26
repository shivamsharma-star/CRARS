const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const session = require('express-session')





const app = express();
const port = 3550;


// create connection 
const db = mysql.createConnection(
    {
    host: 'localhost',
    user: 'root',       
    password: '',  
    database: 'minor_project_1'
    }
);



db.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
  });

  app.use(session({
    secret: 'Softmax@336',  
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }   
  }));



app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let userOtp = {}; // Store OTPs with email as keys

// Route to render the login page
app.get('/', (req, res) => {
    res.render('index', {
         message : 0,
         loginError : 0,
    });
    // console.log(req)
    console.log(req.headers.json);
});

// Endpoint to send OTP via email
app.post('/send-email', async (req, res) => {
    const { emailReceiver } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
    userOtp[emailReceiver] = otp; // Store OTP for the email

    try {
        // Sending OTP using an email service API
        await axios.post('http://127.0.0.1:12300/send-email', {
            EmailReceiver: emailReceiver,
            subject: "OTP Verification",
            text: `Your OTP is ${otp}`,
            html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRARS OTP Verification</title>
    <style>
        body, h1, p {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        body {
            background: #f9f2e7;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: #ff7300;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
        }
        h1 {
            font-size: 28px;
            color: #ffffff;
            margin-bottom: 20px;
        }
        p {
            font-size: 16px;
            color: #3e3e3e;
            margin-bottom: 20px;
        }
        .otp-box {
            background-color: #fff;
            border-radius: 8px;
            display: inline-block;
            font-size: 36px;
            font-weight: bold;
            padding: 15px 30px;
            color: #264653;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            letter-spacing: 5px;
            margin-bottom: 30px;
        }
        .btn {
            padding: 12px 30px;
            background: #f4a261;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s ease;
        }
        .btn:hover {
            background: #e76f51;
        }
        .footer {
            font-size: 14px;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>CRARS OTP Verification</h1>
        <p>your OTP is following </p>
        <div class="otp-box">
            ${otp}
        </div>
        
        <p class="footer">Use this OTP within 5 minutes. If you didn't request this, please ignore this email.</p>
    </div>
</body>
</html>

`
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Error sending email:", error);
        res.json({ success: false });
    }
});

// Endpoint to verify OTP
app.post('/verify-otp', (req, res) => {
    const { otp, emailReceiver } = req.body;
    
    if (userOtp[emailReceiver] && userOtp[emailReceiver] == otp) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});
    
// for signup perpose

app.post('/signup', async (req, res) => {
    const { name, email, location, latitude, longitude, password } = req.body;
  
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Insert user data into the database
      const query = `
        INSERT INTO user (user_name, Email, location, latitude, longitude, password)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
  
      db.query(query, [name, email, location, latitude, longitude, hashedPassword], (err, results) => {
        if (err) {
          console.error('Error inserting data:', err);
          res.status(500).send("Error occurred while creating account");
        } else {
          console.log('User data inserted successfully');
          res.render('index', { message: "Account created successfully!", loginError : 0 });
        }
      });
    } catch (error) {
      console.error('Error during signup:', error);
      res.status(500).send("Internal server error");
    }
  });

// for login perpose 3:00 17 Nov
app.post('/dashboard', (req, res) => {
    const { Email, password } = req.body;
  console.log(req.body)
    // Query to find the user by email
    const query = `SELECT * FROM user WHERE Email = ?`;
    db.query(query, [Email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        res.status(500).send("Internal server error");
        return;
      } 
  
      if (results.length > 0) {
        const user = results[0];
       console.log(user.user_id);
        // Compare entered password with hashed password in the database
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (passwordMatch) {
          // Store user data in session
          req.session.user = {
            id: user.user_id,
            name: user.user_name,
            email: user.Email,
            // role: user.role,
            location: user.location,
            latitude: user.latitude,
            longitude: user.longitude
          };
  
          // Redirect to main page and send session data
          res.render('main', { user: req.session.user });
        } else {
          // Password does not match
          res.render('index', { loginError: "Incorrect email or password.", message: 0 });
        }
      } else {
        // No user found with the entered email
        res.render('index', { loginError: "Incorrect email or password.", message: 0 });
      }
    });
  });
  
  app.get('/main', (req, res) => {
    if (req.session.user) {
      res.render('main', { user: req.session.user });
    } else {
      res.redirect('/'); // redirect to login if not logged in
    }
  });
  
  app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error logging out:', err);
      }
      res.redirect('/');
    });
  });

  // app.get('/resources', (req,res) => {
  //   res.render('resources');
  // });

   app.get('/about', (req,res) => {
      res.render('test05');
    });
   // Route to display profile page with session data
// Route to display profile page and allow updates if user is the logged-in user
app.get('/profile/:id', (req, res) => {
  const profileId = req.params.id;
  const loggedInUserId = req.session.user?.id;

  const query = `SELECT * FROM user WHERE user_id = ?`;
  db.query(query, [profileId], (err, results) => {
      if (err) {
          console.error('Database error:', err);
          return res.status(500).send("Internal server error");
      }

      if (results.length > 0) {
          const profileUser = results[0];
          const isOwnProfile = loggedInUserId === profileUser.user_id; // Check if the logged-in user is viewing their own profile

          res.render('profile', {
              user: profileUser,
              isOwnProfile: isOwnProfile
          });
      } else {
          res.status(404).send("Profile not found");
      }
  });
});

// Route to handle profile update
app.post('/profile/update', (req, res) => {
  const loggedInUserId = req.session.user?.id;
  if (!loggedInUserId) {
      return res.redirect('/'); // Redirect to login if not logged in
  }

  const { name, location, latitude, longitude } = req.body;
  const query = `UPDATE user SET user_name = ?, location = ?, latitude = ?, longitude = ? WHERE user_id = ?`;

  db.query(query, [name, location, latitude, longitude, loggedInUserId], (err, result) => {
      if (err) {
          console.error('Database error:', err);
          return res.status(500).send("Internal server error");
      }
      res.redirect(`/profile/${loggedInUserId}`); // Redirect to updated profile
  });
});

app.get('/chat-list', (req, res) => {
  const query = `SELECT user_id, user_name, latitude, longitude FROM user`;

  db.query(query, (err, users) => {
      if (err) {
          console.error('Database error:', err);
          return res.status(500).send("Internal server error");
      }
      res.render('test-chat-list', { users });
  });
});



    // app.get('/chat-list', (req, res) => {
    //     res.render('chat-list');
    // });
    app.get('/chat', (req, res) => {
        res.render('chat1');
       
    });

// 

// app.post('/create_alert', (req, res) => {
//   res.render('alert');
// });
app.get('/alert', (req,res) => {
  const query = `SELECT * FROM alert`;
  db.query(query,  async (err, alert_result) => {
      if (err) {
        console.error('Database error:', err);
        res.status(500).send("Internal server error");
        return;
      } 
      else if(alert_result.length > 0){
      //   alert_result1 = { 
      //    alert_id: alert_result[0].alert_id,
      //   title :alert_result.title,
      //   dis: alert_result.dis,
      //   type: alert_result.type,
      //   sender_id: alert_result.sender_id,
      //   latitude: alert_result.latitude,
      //   longitude: alert_result.longitude,
      //   time: alert_result.time
      // };
        console.log(alert_result);
        res.render('alert',  { user: req.session.user , alert_result: alert_result});
        // res.render('alert', { user: req.session?.user || {}, alert_result });

      }
      else{
        console.log('something went wrong');
      }
//  console.log(user.user_id);

});
});


app.post('/create_alert', (req, res) => {
  // Extract data from the form submission
  const { title, discription, sender_id,longitude, lattitude, cityname, type } = req.body;
  // const sender_id = req.session.user_id; // Assuming sender_id is from the logged-in user's session

  // Define the query to insert data into the alert table
  const query = `
      INSERT INTO alert (title, dis, type, sender_id, latitude, longitude, time)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;

  // Execute the query
  db.query(
      query,
      [title, discription, type, sender_id, lattitude, longitude],
      (err, result) => {
          if (err) {
              console.error('Error inserting alert data:', err);
              res.status(500).send('Error creating alert');
              return;
          }
          console.log('Alert created successfully with ID:', result.insertId);
          res.redirect('/alert'); // Redirect to the alerts page or any other page after submission
      }
  );
});

app.get('/ad/:id', (req, res) => {
  const alert_id = req.params.id;
  const q = "SELECT alert.alert_id, alert.title, alert.type, alert.dis, alert.latitude AS alert_latitude, alert.longitude AS alert_longitude, alert.time, user.user_id, user.user_name, user.email, user.location AS user_location, user.latitude AS user_latitude, user.longitude AS user_longitude FROM alert JOIN user ON alert.sender_id = user.user_id WHERE alert.alert_id = ?";


  db.query(q, [alert_id], (err, result) => {
    if (err) {
      console.error('Error fetching alert data:', err);
      res.status(500).send('Error fetching alert data');
      return;
    }

    // Check if result is empty
    if (result.length === 0) {
      res.status(404).send('Alert not found');
      return;
    }
    
    console.log(result[0]);
    res.render('ad', { alert: result[0] , user: req.session.user });
  }); 
});

app.post('/deletealert' ,(req,res) => {
 const alert_id = req.body.alert_id;
  query= "DELETE FROM alert WHERE `alert`.`alert_id` = ?";
        db.query(query,[alert_id],(err,result) =>{
          if (err) {
            console.error('Error fetching alert data:', err);
            res.status(500).send('Error fetching alert data');
            return;
          }
          console.log(alert_id);
        });
}
);
app.get('/ajency',(req,res)=> {
  const userId = 1; // Assume logged-in user's ID is 1 for this example

  const query = 'SELECT * FROM agency';
  db.query(query, (err, results) => {
      if (err) {
          console.error(err);
          res.status(500).send('Failed to fetch agencies.');
      } else {
          res.render('agc', {
              agencies: results,
              userId: req.session.user.id,
              user : req.session.user
          });
      }
  });
});

app.post('/create-agency', (req, res) => {
  const { name, longitude, latitude, description, creator_user_id } = req.body;

  const query = `
      INSERT INTO agency (name, longitude, latitude, description, creator_user_id) 
      VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [name, longitude, latitude, description, creator_user_id], (err, result) => {
      if (err) {
          console.error(err);
          res.status(500).send('Failed to create agency.');
      } else {
          res.send('Agency created successfully!');
      }
  });
});

// DELETE route to remove an agency
app.post('/delete-agency/:agency_id', (req, res) => {
  const agencyId = req.params.agency_id;

  const deleteQuery = 'DELETE FROM agency WHERE agency_id = ?';
  db.query(deleteQuery, [agencyId], (err, result) => {
      if (err) {
          console.error(err);
          res.status(500).send('Failed to delete the agency.');
      } else {
          res.redirect('/agencies'); // Redirect back to the agencies list after deletion
      }
  });
});

app.get('/resources', (req, res) => {
  const selectQuery = 'SELECT * FROM resource';
  db.query(selectQuery, (err, results) => {
      if (err) {
          console.error(err);
          res.status(500).send('Failed to fetch resources.');
      } else {
          res.render('resources', { resources: results });
      }
  });
});

// **Route to render form for creating a new resource**
app.get('/resources/create', (req, res) => {
  res.render('createResource'); // Render the form to create a resource
});

// **Route to create a new resource**
app.post('/resources/create', (req, res) => {
  const { resource_name, resource_image_link, description, user_id } = req.body;
  
  const insertQuery = `
      INSERT INTO resource (resource_name, resource_image_link, description, user_id) 
      VALUES (?, ?, ?, ?)`;
  
  db.query(insertQuery, [resource_name, resource_image_link, description, user_id], (err, result) => {
      if (err) {
          console.error(err);
          res.status(500).send('Failed to create resource.');
      } else {
          res.redirect('/resources'); // Redirect to resources list after creation
      }
  });
});

// **Route to render form for editing an existing resource**
app.get('/resources/edit/:resource_id', (req, res) => {
  const resourceId = req.params.resource_id;
  
  const selectQuery = 'SELECT * FROM resource WHERE resource_id = ?';
  db.query(selectQuery, [resourceId], (err, results) => {
      if (err || results.length === 0) {
          console.error(err);
          res.status(500).send('Resource not found.');
      } else {
          res.render('editResource', { resource: results[0] }); // Render form with existing resource data
      }
  });
});

// **Route to update an existing resource**
app.post('/resources/update/:resource_id', (req, res) => {
  const resourceId = req.params.resource_id;
  const { resource_name, resource_image_link, description } = req.body;
  
  const updateQuery = `
      UPDATE resource 
      SET resource_name = ?, resource_image_link = ?, description = ? 
      WHERE resource_id = ?`;
  
  db.query(updateQuery, [resource_name, resource_image_link, description, resourceId], (err, result) => {
      if (err) {
          console.error(err);
          res.status(500).send('Failed to update resource.');
      } else {
          res.redirect('/resources'); // Redirect to resources list after update
      }
  });
});

// **Route to delete a resource**
app.post('/resources/delete/:resource_id', (req, res) => {
  const resourceId = req.params.resource_id;
  
  const deleteQuery = `DELETE FROM resource WHERE resource_id = ?`;
  db.query(deleteQuery, [resourceId], (err, result) => {
      if (err) {
          console.error(err);
          res.status(500).send('Failed to delete resource.');
      } else {
          res.redirect('/resources'); // Redirect to resources list after deletion
      }
  });
});

// Start the server
app.get('/metachat',(req,res)=>{

res.render('metachat', { user : req.session.user});

});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

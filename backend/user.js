const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");
const { authenticate } = require("./auth");

const router = express.Router();
const uploadDir = path.join(__dirname, "uploads", "cv");
fs.mkdirSync(uploadDir, { recursive: true });

function clean(value, max = 10000) {
    return String(value ?? "").trim().slice(0, max);
}

function publicUser(user) {
    return user;
}

async function notifyUser(userId, title, message, type = "info") {
    try {
        await db.execute(
            `INSERT INTO user_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
            [userId, title, message, type]
        );
    } catch (error) {
        console.error("User notification error:", error.message);
    }
}

async function notifyAdmin(title, message, type = "info") {
    try {
        await db.execute(`INSERT INTO admin_notifications (title, message, type) VALUES (?, ?, ?)`, [title, message, type]);
    } catch (error) { console.error("Admin notification error:", error.message); }
}

async function getUser(userId) {
    const [rows] = await db.execute(
        `SELECT id, full_name, email, phone, account_type, profession, experience,
                career_field, job_title, location, skill, bio, education, career_interest, email_verified,
                is_active, created_at, updated_at
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
}

router.get("/dashboard", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const [[applications]] = await db.query("SELECT COUNT(*) count FROM applications WHERE user_id = ?", [userId]);
        const [[pendingApplications]] = await db.query("SELECT COUNT(*) count FROM applications WHERE user_id = ? AND status IN ('pending','reviewing')", [userId]);
        const [[shortlisted]] = await db.query("SELECT COUNT(*) count FROM applications WHERE user_id = ? AND status = 'shortlisted'", [userId]);
        const [[interviews]] = await db.query("SELECT COUNT(*) count FROM applications WHERE user_id = ? AND status = 'interview'", [userId]);
        const [[enrollments]] = await db.query("SELECT COUNT(*) count FROM course_enrollments WHERE user_id = ?", [userId]);
        const [[appointments]] = await db.query("SELECT COUNT(*) count FROM appointments WHERE user_id = ? AND appointment_date >= CURDATE() AND status NOT IN ('cancelled','rejected')", [userId]);
        const [[unread]] = await db.query("SELECT COUNT(*) count FROM user_notifications WHERE user_id = ? AND is_read = 0", [userId]);
        const [[cv]] = await db.query("SELECT id, status, file_name, review_type, created_at FROM cv_reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", [userId]);
        const [activity] = await db.execute(`
            SELECT 'application' type, a.id, CONCAT('Application for ', j.title) title, a.status, a.updated_at created_at
            FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.user_id = ?
            UNION ALL
            SELECT 'appointment', ap.id, CONCAT('Appointment: ', ap.consultation_type), ap.status, ap.updated_at
            FROM appointments ap WHERE ap.user_id = ?
            UNION ALL
            SELECT 'notification', n.id, n.title, n.type, n.created_at
            FROM user_notifications n WHERE n.user_id = ?
            ORDER BY created_at DESC LIMIT 10`, [userId, userId, userId]);
        const profileFields = ["full_name","phone","location","profession","experience","career_field","job_title","skill","education","career_interest","bio"];
        const filled = profileFields.filter(key => clean(req.user[key])).length;
        const profileCompletion = Math.round((filled / profileFields.length) * 100);
        res.json({ success: true, user: publicUser(req.user), stats: {
            applications: Number(applications.count), pendingApplications: Number(pendingApplications.count),
            shortlisted: Number(shortlisted.count), interviews: Number(interviews.count),
            enrollments: Number(enrollments.count), appointments: Number(appointments.count), unread: Number(unread.count),
            profileCompletion
        }, cv: cv || null, activity });
    } catch (error) {
        console.error("User dashboard error:", error);
        res.status(500).json({ success: false, message: "Unable to load your dashboard" });
    }
});

router.get("/profile", authenticate, async (req, res) => {
    try { res.json({ success: true, user: await getUser(req.user.id) }); }
    catch (error) { res.status(500).json({ success: false, message: "Unable to load profile" }); }
});

router.put("/profile", authenticate, async (req, res) => {
    try {
        const fields = {
            full_name: clean(req.body.full_name, 150), phone: clean(req.body.phone, 50),
            profession: clean(req.body.profession, 150), experience: clean(req.body.experience, 50),
            career_field: clean(req.body.career_field, 150), job_title: clean(req.body.job_title, 150),
            location: clean(req.body.location, 150), skill: clean(req.body.skill, 500), bio: clean(req.body.bio, 3000),
            education: clean(req.body.education, 1000), career_interest: clean(req.body.career_interest, 300)
        };
        if (!fields.full_name || !fields.phone) return res.status(400).json({ success:false, message:"Full name and phone number are required" });
        await db.execute(`UPDATE users SET full_name=?, phone=?, profession=?, experience=?, career_field=?, job_title=?, location=?, skill=?, bio=?, education=?, career_interest=? WHERE id=?`, [
            fields.full_name, fields.phone, fields.profession || null, fields.experience || null,
            fields.career_field || null, fields.job_title || null, fields.location || null,
            fields.skill || null, fields.bio || null, fields.education || null, fields.career_interest || null, req.user.id
        ]);
        const user = await getUser(req.user.id);
        await notifyUser(req.user.id, "Profile updated", "Your SJH Consult profile was updated successfully.", "success");
        res.json({ success:true, message:"Profile updated successfully", user });
    } catch (error) { console.error(error); res.status(500).json({success:false,message:"Unable to update profile"}); }
});

router.get("/applications", authenticate, async (req, res) => {
    try {
        const [applications] = await db.execute(`
            SELECT a.*, j.title job_title, j.company, j.location, j.category, j.job_type, j.salary,
                   j.description job_description, j.requirements job_requirements
            FROM applications a JOIN jobs j ON j.id=a.job_id
            WHERE a.user_id=? ORDER BY a.created_at DESC`, [req.user.id]);
        res.json({success:true, applications});
    } catch (error) { console.error(error); res.status(500).json({success:false,message:"Unable to load applications"}); }
});

router.get("/applications/:id", authenticate, async (req,res) => {
    try {
        const id=Number(req.params.id);
        const [[application]]=await db.query(`
            SELECT a.*, j.title job_title, j.company, j.location, j.category, j.job_type, j.salary,
                   j.description job_description, j.requirements job_requirements
            FROM applications a JOIN jobs j ON j.id=a.job_id
            WHERE a.id=? AND a.user_id=? LIMIT 1`, [id,req.user.id]);
        if(!application) return res.status(404).json({success:false,message:"Application not found"});
        const [history]=await db.execute(`SELECT old_status,new_status,admin_notes,created_at FROM application_status_history WHERE application_id=? ORDER BY created_at DESC`,[id]);
        res.json({success:true,application,history});
    } catch(error){console.error(error);res.status(500).json({success:false,message:"Unable to load application details"});}
});

router.post("/applications", authenticate, async (req, res) => {
    try {
        const jobId = Number(req.body.job_id);
        const coverLetter = clean(req.body.cover_letter, 5000);
        if (!Number.isInteger(jobId) || jobId < 1) return res.status(400).json({success:false,message:"A valid job is required"});
        const [[job]] = await db.query("SELECT id,title,company,status FROM jobs WHERE id=? LIMIT 1", [jobId]);
        if (!job || job.status !== "active") return res.status(404).json({success:false,message:"This job is no longer available"});
        const [[existing]] = await db.query("SELECT id,status FROM applications WHERE user_id=? AND job_id=? LIMIT 1", [req.user.id, jobId]);
        if (existing) return res.status(409).json({success:false,message:`You have already applied for this job. Current status: ${existing.status}`});
        const [result] = await db.execute("INSERT INTO applications (user_id,job_id,cover_letter,status) VALUES (?,?,?,'pending')", [req.user.id,jobId,coverLetter || null]);
        await db.execute("INSERT INTO application_status_history (application_id,old_status,new_status,admin_notes,changed_by) VALUES (?,?,?,?,NULL)",[result.insertId,null,'pending',null]);
        await notifyUser(req.user.id, "Application submitted", `Your application for ${job.title} at ${job.company} has been submitted and is pending review.`, "success");
        await notifyAdmin("New job application", `${req.user.full_name} applied for ${job.title} at ${job.company}.`, "info");
        res.status(201).json({success:true,message:"Application submitted successfully",id:result.insertId});
    } catch (error) { console.error(error); res.status(500).json({success:false,message:"Unable to submit application"}); }
});

router.post("/applications/:id/withdraw", authenticate, async (req,res)=>{
    try{
        const id=Number(req.params.id);
        if(!Number.isInteger(id)||id<1)return res.status(400).json({success:false,message:"Invalid application"});
        const [[application]]=await db.query(`SELECT a.id,a.status,j.title job_title,j.company FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND a.user_id=? LIMIT 1`,[id,req.user.id]);
        if(!application)return res.status(404).json({success:false,message:"Application not found"});
        if(!["pending","reviewing"].includes(application.status))return res.status(400).json({success:false,message:"This application can no longer be withdrawn"});
        await db.execute("UPDATE applications SET status='withdrawn' WHERE id=? AND user_id=?",[id,req.user.id]);
        await db.execute("INSERT INTO application_status_history (application_id,old_status,new_status,admin_notes,changed_by) VALUES (?,?,?,?,NULL)",[id,application.status,'withdrawn',null]);
        await notifyUser(req.user.id,"Application withdrawn",`Your application for ${application.job_title} at ${application.company} has been withdrawn successfully.` ,"info");
        await notifyAdmin("Application withdrawn",`${req.user.full_name} withdrew their application for ${application.job_title} at ${application.company}.`,"info");
        res.json({success:true,message:"Application withdrawn successfully"});
    }catch(error){console.error(error);res.status(500).json({success:false,message:"Unable to withdraw application"});}
});

router.get("/training", authenticate, async (req,res)=>{
    try {
        const [courses]=await db.execute(`SELECT c.*, e.id enrollment_id, e.status enrollment_status, e.created_at enrolled_at FROM training_courses c LEFT JOIN course_enrollments e ON e.course_id=c.id AND e.user_id=? WHERE c.status='active' ORDER BY c.created_at DESC`,[req.user.id]);
        res.json({success:true,courses});
    }catch(error){res.status(500).json({success:false,message:"Unable to load training"});}
});

router.post("/training/:courseId/enroll", authenticate, async (req,res)=>{
    try {
        const courseId=Number(req.params.courseId);
        if(!Number.isInteger(courseId)||courseId<1) return res.status(400).json({success:false,message:"Invalid training course"});
        const [[course]]=await db.query("SELECT id,title,status,price FROM training_courses WHERE id=? LIMIT 1",[courseId]);
        if(!course||course.status!=="active") return res.status(404).json({success:false,message:"Training course not found"});
        const [[existing]]=await db.query("SELECT id,status FROM course_enrollments WHERE course_id=? AND user_id=? LIMIT 1",[courseId,req.user.id]);
        if(existing && existing.status !== "cancelled") return res.json({success:true,alreadyEnrolled:true,message:`You are already enrolled in ${course.title}`});
        const price=Number(course.price||0);
        if(price<=0){
            await db.execute("INSERT INTO course_enrollments (course_id,user_id,status) VALUES (?,?, 'active') ON DUPLICATE KEY UPDATE status='active'",[courseId,req.user.id]);
            await notifyUser(req.user.id,"Training enrollment confirmed",`You are enrolled in ${course.title}. This course is free.` ,"success");
            return res.json({success:true,free:true,message:`You are now enrolled in ${course.title}`});
        }
        const reference=`SJH-TRN-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        await db.execute("INSERT INTO payments (user_id,reference,purpose,amount,course_id,status,provider) VALUES (?,?,?,?,?,'pending','paystack')",[req.user.id,reference,`Training: ${course.title}`,price,courseId]);
        const secret=process.env.PAYSTACK_SECRET_KEY;
        if(!secret||secret.includes("your")){await db.execute("UPDATE payments SET status='failed' WHERE reference=?",[reference]);return res.status(503).json({success:false,message:"Training payment is not configured. Add PAYSTACK_SECRET_KEY to backend/.env."});}
        const callback=`${process.env.FRONTEND_URL||"http://127.0.0.1:5500"}/payments/payment.html?reference=${encodeURIComponent(reference)}&courseId=${courseId}`;
        const response=await fetch("https://api.paystack.co/transaction/initialize",{method:"POST",headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/json"},body:JSON.stringify({email:req.user.email,amount:Math.round(price*100),reference,callback_url:callback,metadata:{course_id:courseId,course_title:course.title}})});
        const data=await response.json();
        if(!response.ok||!data.status){await db.execute("UPDATE payments SET status='failed' WHERE reference=?",[reference]);return res.status(502).json({success:false,message:data.message||"Unable to initialize training payment"});}
        res.json({success:true,paymentRequired:true,reference,authorization_url:data.data.authorization_url,amount:price,course:{id:course.id,title:course.title}});
    } catch(error){console.error("Training enrollment error:",error);res.status(500).json({success:false,message:"Unable to start training enrollment"});}
});

router.get("/enrollments", authenticate, async(req,res)=>{
    try{const [rows]=await db.execute(`SELECT e.*, c.title,c.category,c.price,c.description FROM course_enrollments e JOIN training_courses c ON c.id=e.course_id WHERE e.user_id=? ORDER BY e.created_at DESC`,[req.user.id]);res.json({success:true,enrollments:rows});}
    catch(error){res.status(500).json({success:false,message:"Unable to load enrollments"});}
});

router.get("/appointments", authenticate, async(req,res)=>{
    try{const [rows]=await db.execute("SELECT * FROM appointments WHERE user_id=? ORDER BY appointment_date DESC, appointment_time DESC",[req.user.id]);res.json({success:true,appointments:rows});}
    catch(error){res.status(500).json({success:false,message:"Unable to load appointments"});}
});

router.post("/appointments", authenticate, async(req,res)=>{
    try{
        const type=clean(req.body.consultation_type,150); const date=clean(req.body.appointment_date,20); const time=clean(req.body.appointment_time,50); const notes=clean(req.body.notes,3000);
        if(!type||!date||!time)return res.status(400).json({success:false,message:"Consultation type, date and time are required"});
        if(new Date(`${date}T${time}`)<new Date())return res.status(400).json({success:false,message:"Please choose a future date and time"});
        const [result]=await db.execute("INSERT INTO appointments (user_id,consultation_type,appointment_date,appointment_time,notes) VALUES (?,?,?,?,?)",[req.user.id,type,date,time,notes||null]);
        await notifyUser(req.user.id,"Appointment requested",`Your ${type} appointment request has been received.`,"success");
        res.status(201).json({success:true,message:"Appointment request submitted",id:result.insertId});
    }catch(error){res.status(500).json({success:false,message:"Unable to request appointment"});}
});

router.get("/cv-review", authenticate, async(req,res)=>{
    try{const [rows]=await db.execute("SELECT * FROM cv_reviews WHERE user_id=? ORDER BY created_at DESC",[req.user.id]);res.json({success:true,reviews:rows});}
    catch(error){res.status(500).json({success:false,message:"Unable to load CV reviews"});}
});

router.post("/cv-review", authenticate, async(req,res)=>{
    try{
        const fileName=clean(req.body.file_name,255); const reviewType=clean(req.body.review_type,50); const note=clean(req.body.message,3000); const dataUrl=String(req.body.file_data||"");
        if(!fileName||!reviewType||!dataUrl)return res.status(400).json({success:false,message:"CV file, review type and file data are required"});
        if(!/\.(pdf|doc|docx)$/i.test(fileName))return res.status(400).json({success:false,message:"Only PDF, DOC and DOCX files are allowed"});
        const match=dataUrl.match(/^data:([^;]+);base64,(.+)$/); if(!match)return res.status(400).json({success:false,message:"Invalid CV file"});
        const buffer=Buffer.from(match[2],"base64"); if(buffer.length>5*1024*1024)return res.status(400).json({success:false,message:"CV must be 5MB or smaller"});
        const safe=path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g,"_"); const stored=`${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safe}`; fs.writeFileSync(path.join(uploadDir,stored),buffer);
        const fileUrl=`/uploads/cv/${stored}`;
        const [result]=await db.execute("INSERT INTO cv_reviews (user_id,file_name,file_url,review_type,message,status) VALUES (?,?,?,?,?,'pending')",[req.user.id,fileName,fileUrl,reviewType,note||null]);
        await notifyUser(req.user.id,"CV submitted","Your CV has been submitted for professional review.","success");
        res.status(201).json({success:true,message:"CV submitted successfully",id:result.insertId,file_url:fileUrl});
    }catch(error){console.error(error);res.status(500).json({success:false,message:"Unable to submit your CV"});}
});

router.get("/notifications", authenticate, async(req,res)=>{
    try{const [rows]=await db.execute("SELECT * FROM user_notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100",[req.user.id]);res.json({success:true,notifications:rows});}
    catch(error){res.status(500).json({success:false,message:"Unable to load notifications"});}
});
router.put("/notifications/:id/read", authenticate, async(req,res)=>{try{await db.execute("UPDATE user_notifications SET is_read=1 WHERE id=? AND user_id=?",[Number(req.params.id),req.user.id]);res.json({success:true,message:"Notification marked as read"});}catch(error){res.status(500).json({success:false,message:"Unable to update notification"});}});
router.put("/notifications/read-all", authenticate, async(req,res)=>{try{await db.execute("UPDATE user_notifications SET is_read=1 WHERE user_id=?",[req.user.id]);res.json({success:true,message:"All notifications marked as read"});}catch(error){res.status(500).json({success:false,message:"Unable to update notifications"});}});
router.delete("/notifications/:id", authenticate, async(req,res)=>{try{await db.execute("DELETE FROM user_notifications WHERE id=? AND user_id=?",[Number(req.params.id),req.user.id]);res.json({success:true,message:"Notification deleted"});}catch(error){res.status(500).json({success:false,message:"Unable to delete notification"});}});

router.get("/messages", authenticate, async(req,res)=>{try{const [rows]=await db.execute("SELECT id,subject,message,admin_reply,status,replied_at,created_at,updated_at FROM messages WHERE user_id=? ORDER BY created_at DESC",[req.user.id]);res.json({success:true,messages:rows});}catch(error){res.status(500).json({success:false,message:"Unable to load messages"});}});
router.post("/messages", authenticate, async(req,res)=>{try{const subject=clean(req.body.subject,200), message=clean(req.body.message,5000);if(!subject||message.length<10)return res.status(400).json({success:false,message:"Subject and a detailed message are required"});const [r]=await db.execute("INSERT INTO messages (user_id,subject,message) VALUES (?,?,?)",[req.user.id,subject,message]);res.status(201).json({success:true,message:"Message sent to SJH Consult support",id:r.insertId});}catch(error){res.status(500).json({success:false,message:"Unable to send message"});}});

router.get("/payments", authenticate, async(req,res)=>{try{const [rows]=await db.execute("SELECT * FROM payments WHERE user_id=? ORDER BY created_at DESC",[req.user.id]);res.json({success:true,payments:rows});}catch(error){res.status(500).json({success:false,message:"Unable to load payment history"});}});

router.post("/payments/initialize", authenticate, async(req,res)=>{
    try{
        const purpose=clean(req.body.purpose,150); const email=req.user.email;
        const allowedPrices={"CV Review":10000,"Career Consultation":15000,"Professional Consultation":20000,"Training":12000};
        const amount=allowedPrices[purpose];
        if(!purpose || !Number.isFinite(amount))return res.status(400).json({success:false,message:"Please select a valid SJH Consult payment service."});
        const reference=`SJH-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        await db.execute("INSERT INTO payments (user_id,reference,purpose,amount,status,provider) VALUES (?,?,?,?,'pending','paystack')",[req.user.id,reference,purpose,amount]);
        const secret=process.env.PAYSTACK_SECRET_KEY;
        if(!secret||secret.includes("your"))return res.status(503).json({success:false,message:"Paystack is not configured. Add PAYSTACK_SECRET_KEY to backend/.env.",reference});
        const response=await fetch("https://api.paystack.co/transaction/initialize",{method:"POST",headers:{Authorization:`Bearer ${secret}`,"Content-Type":"application/json"},body:JSON.stringify({email,amount:Math.round(amount*100),reference,callback_url:`${process.env.FRONTEND_URL||"http://127.0.0.1:5500"}/payments/payment.html?reference=${encodeURIComponent(reference)}`})});
        const data=await response.json();
        if(!response.ok||!data.status){await db.execute("UPDATE payments SET status='failed' WHERE reference=?",[reference]);return res.status(502).json({success:false,message:data.message||"Unable to initialize Paystack payment",reference});}
        res.json({success:true,reference,authorization_url:data.data.authorization_url,access_code:data.data.access_code});
    }catch(error){console.error("Paystack init error:",error);res.status(500).json({success:false,message:"Unable to initialize payment"});}
});

router.get("/payments/verify/:reference", authenticate, async(req,res)=>{
    try{
        const reference=clean(req.params.reference,100); const [[payment]]=await db.query("SELECT * FROM payments WHERE reference=? AND user_id=? LIMIT 1",[reference,req.user.id]);
        if(!payment)return res.status(404).json({success:false,message:"Payment not found"});
        const secret=process.env.PAYSTACK_SECRET_KEY; if(!secret)return res.status(503).json({success:false,message:"Paystack is not configured"});
        const response=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${secret}`} }); const data=await response.json();
        const successful=response.ok&&data.status&&data.data&&data.data.status==="success";
        await db.execute("UPDATE payments SET status=?,provider='paystack' WHERE reference=? AND user_id=?",[successful?"successful":"failed",reference,req.user.id]);
        if(successful){
            if(payment.course_id){
                await db.execute("INSERT INTO course_enrollments (course_id,user_id,status) VALUES (?,?, 'active') ON DUPLICATE KEY UPDATE status='active'",[payment.course_id,req.user.id]);
                await notifyUser(req.user.id,"Training payment confirmed",`Your payment for ${payment.purpose.replace(/^Training:\s*/i,"")} was successful. You are now enrolled and can continue with your training.`,"success");
            }else{
                await notifyUser(req.user.id,"Payment successful",`Payment for ${payment.purpose} was confirmed successfully.`,"success");
            }
        }else if(payment.course_id){
            await notifyUser(req.user.id,"Training payment not completed",`Your payment for ${payment.purpose.replace(/^Training:\s*/i,"")} could not be confirmed. You are not enrolled yet.`,"warning");
        }
        res.json({success:true,verified:successful,enrolled:successful&&!!payment.course_id,payment:{...payment,status:successful?"successful":"failed"}});
    }catch(error){res.status(500).json({success:false,message:"Unable to verify payment"});}
});

router.get("/saved", authenticate, async(req,res)=>{try{const [rows]=await db.execute(`SELECT s.id save_id,s.created_at saved_at,j.* FROM saved_jobs s JOIN jobs j ON j.id=s.job_id WHERE s.user_id=? ORDER BY s.created_at DESC`,[req.user.id]);res.json({success:true,saved:rows});}catch(error){res.status(500).json({success:false,message:"Unable to load saved jobs"});}});
router.post("/saved/:jobId", authenticate, async(req,res)=>{try{const jobId=Number(req.params.jobId);const [[job]]=await db.query("SELECT id FROM jobs WHERE id=? LIMIT 1",[jobId]);if(!job)return res.status(404).json({success:false,message:"Job not found"});await db.execute("INSERT INTO saved_jobs (user_id,job_id) VALUES (?,?) ON DUPLICATE KEY UPDATE created_at=created_at",[req.user.id,jobId]);res.json({success:true,message:"Job saved"});}catch(error){res.status(500).json({success:false,message:"Unable to save job"});}});
router.delete("/saved/:jobId", authenticate, async(req,res)=>{try{await db.execute("DELETE FROM saved_jobs WHERE user_id=? AND job_id=?",[req.user.id,Number(req.params.jobId)]);res.json({success:true,message:"Job removed from saved opportunities"});}catch(error){res.status(500).json({success:false,message:"Unable to remove saved job"});}});

router.get("/certificates", authenticate, async(req,res)=>{try{const [rows]=await db.execute(`SELECT c.* FROM certificates c WHERE c.user_id=? ORDER BY c.issued_at DESC`,[req.user.id]);res.json({success:true,certificates:rows});}catch(error){res.status(500).json({success:false,message:"Unable to load certificates"});}});

router.post("/service-requests", authenticate, async(req,res)=>{try{const serviceId=Number(req.body.service_id)||null;const subject=clean(req.body.subject,200);const details=clean(req.body.details,5000);if(!subject||!details)return res.status(400).json({success:false,message:"Subject and details are required"});const [r]=await db.execute("INSERT INTO service_requests (user_id,service_id,subject,details,status) VALUES (?,?,?,?,'pending')",[req.user.id,serviceId,subject,details]);await notifyUser(req.user.id,"Service request received","Your service request has been received by SJH Consult.","success");res.status(201).json({success:true,message:"Service request submitted",id:r.insertId});}catch(error){res.status(500).json({success:false,message:"Unable to submit service request"});}});

router.post("/reviews", authenticate, async(req,res)=>{try{const rating=Number(req.body.rating),text=clean(req.body.review_text,3000);if(rating<1||rating>5||!text)return res.status(400).json({success:false,message:"Rating and review are required"});const [r]=await db.execute("INSERT INTO reviews (user_id,rating,review_text,status) VALUES (?,?,?,'pending')",[req.user.id,rating,text]);res.status(201).json({success:true,message:"Thank you. Your review has been submitted for moderation.",id:r.insertId});}catch(error){res.status(500).json({success:false,message:"Unable to submit review"});}});

router.delete("/account", authenticate, async(req,res)=>{try{await db.execute("UPDATE users SET is_active=0 WHERE id=?",[req.user.id]);res.clearCookie("sjh_token",{httpOnly:true,secure:process.env.NODE_ENV === "production",sameSite:process.env.NODE_ENV === "production" ? "none" : "lax",path:"/"});res.json({success:true,message:"Your account has been deactivated"});}catch(error){res.status(500).json({success:false,message:"Unable to deactivate account"});}});

module.exports = { router, notifyUser };

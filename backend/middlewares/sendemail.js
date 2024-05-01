const nodeMailer = require('nodemailer');

exports.sendEmail = async (options) => {
    var transporter = nodeMailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: "eb062c876ef9d9",
          pass: "6b214b8f0fea60",
        }
      });

    const mailOptions = {
        from:"6b214b8f0fea60",
        to: options.email,
        subject: options.subject,
        text: options.message,
    }

    await transporter.sendMail(mailOptions);
}
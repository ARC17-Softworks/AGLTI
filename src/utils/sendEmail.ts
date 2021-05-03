import * as nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

export interface sendEmailOptions {
	email: string;
	subject: string;
	title: string;
	body: string;
	link: string;
	linkName: string;
	bcc?: string[];
}

export async function sendEmail(options: sendEmailOptions) {
	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT),
		auth: {
			user: process.env.SMTP_EMAIL,
			pass: process.env.SMTP_PASSWORD,
		},
		tls: { secureProtocol: 'TLSv1_method', rejectUnauthorized: false },
		secure: false,
		debug: true,
	});

	const message: Mail.Options = {
		from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
		to: options.email,
		subject: options.subject,
		html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
		<html xmlns="http://www.w3.org/1999/xhtml">
			<head>
				<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
				<title>AGLTI</title>
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		
				<style type="text/css">
					@media screen and (max-width: 400px) {
					}
		
					@media screen and (min-width: 401px) and (max-width: 500px) {
					}
		
					@media screen and (max-width: 768px) {
					}
		
					a {
						text-decoration: none !important;
					}
				</style>
			</head>
			<body style="margin: 0px; padding: 0px; background-color: #efefef;">
				<table
					align="center"
					cellpadding="0"
					cellspacing="0"
					width="600"
					style="border-collapse: collapse;"
				>
					<tr>
						<td
							align="center"
							bgcolor="#1e1e1e"
							style="
								padding: 10px;
								font-family: Arial, sans-serif;
								font-size: 40px;
							"
						>
							<img
								src="https://raw.githubusercontent.com/ARC17-Softworks/AGLTI_resources/master/emailTemplate/img/aglti.png"
								alt="AGLTI | CONNECT.COLLABORATE.CREATE."
								width="100%"
								height="auto"
								style="display: block;"
							/>
						</td>
					</tr>
					<tr>
						<td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
							<table cellpadding="0" cellspacing="0" width="100%">
								<tr>
									<td
										align="center"
										style="
											color: #1e1e1e;
											font-family: Arial, sans-serif;
											font-size: 40px;
										"
									>
										<b>${options.title}</b>
									</td>
								</tr>
								<tr>
									<td
										style="
											padding: 30px 0 40px 0;
											color: #1e1e1e;
											font-family: Arial, sans-serif;
											font-size: 24px;
										"
									>
										${options.body}
									</td>
								</tr>
								<tr>
									<td
										align="center"
										style="
											padding: 0 30px 0 30px;
											color: #1e1e1e;
											font-family: Arial, sans-serif;
											font-size: 24px;
										"
									>
										<a
											href="${options.link}"
											style="
												display: inline-block;
												background: #1e1e1e;
												color: #fff;
												padding: 10px 40px;
											"
											target="_blank"
											>${options.linkName}</a
										>
									</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td
							bgcolor="#1e1e1e"
							style="
								padding: 30px 30px 30px 30px;
								color: #fff;
								font-family: Arial, sans-serif;
							"
						>
							<table cellpadding="0" cellspacing="0" width="100%">
								<tr>
									<td width="75%">
										AGLTI &copy; 2020
									</td>
									<td align="right">
										<a
											href="https://github.com/ARC17-Softworks/AGLTI"
											target="_blank"
										>
											<img
												src="https://raw.githubusercontent.com/ARC17-Softworks/AGLTI_resources/master/emailTemplate/img/GitHub.png"
												alt="GitHub"
												width="38"
												height="38"
												style="display: block;"
												border="0"
											/>
										</a>
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
			</body>
		</html>			
		`,
	};

	if (options.bcc) {
		message.bcc = options.bcc;
	}

	const info = await transporter.sendMail(message);

	console.log(`Message sent: ${info.messageId}`);
}

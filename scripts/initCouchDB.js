const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
});

function ask(question, hideInput = false) {
    return new Promise((resolve) => {
        if (!hideInput) {
            rl.question(question, resolve);
        } else {
            const onDataHandler = char => {
                char = char + "";
                switch (char) {
                    case "\n":
                    case "\r":
                    case "\u0004":
                        process.stdout.write("\n");
                        break;
                    default:
                        process.stdout.clearLine();
                        readline.cursorTo(process.stdout, 0);
                        process.stdout.write(question + Array(rl.line.length + 1).join("*"));
                        break;
                }
            };
            process.stdin.on("data", onDataHandler);
            rl.question(question, answer => {
                process.stdin.removeListener("data", onDataHandler);
                resolve(answer);
            });
        }
    });
}

(async () => {
    const newAdmin = process.env.COUCHDB_USERNAME;
    const jwt_secret = process.env.JWT_SECRET;
    const db_name = process.env.COUCHDB_DATABASE;
    if (!newAdmin || !jwt_secret || !db_name) {
        console.error('CouchDB username, jwt_secret, jwt_expires_in and db_name must be set in .env file.');
        rl.close();
        process.exit(1);
    }

    const currentAdmin = await ask('Current admin username: ');
    const currentPassword = await ask('Current admin password: ', true);

    // For single-node CouchDB, use _local; adjust if needed
    const nodeName = '_local';
    const host = '127.0.0.1:5984';
    const baseUrl = `http://${host}/_node/${nodeName}/`;
    const auth = Buffer.from(`${currentAdmin}:${currentPassword}`).toString('base64');
    let adminAlredyExists = false;
    // Check if the new admin user exists
    // GET /_config/admins
    let url = `_config/admins`;
    try {
        const response = await fetch(baseUrl + url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        const res = await response.json();
        if (response.ok) {
            if (res.hasOwnProperty(newAdmin)) {
                adminAlredyExists = true;
                console.log(`User ${newAdmin} already exists.\n`);
            } else {
                console.log(`User ${newAdmin} does not exist.\n`);
            }
        } else {
            console.error(`Error: ${JSON.stringify(res)}\n`);
            rl.close();
            process.exit(1);
        }
    } catch (err) {
        console.error(`Fetch error: ${err.message}`);
        rl.close();
        process.exit(1);
    }

    if (!adminAlredyExists) {
        const newPassword = await ask(`New admin ${newAdmin} password: `, true);
        const newPasswordCopy = await ask(`Repeat new admin ${newAdmin} password: `, true);
        if (newPassword !== newPasswordCopy) {
            console.error('Passwords do not match. Please try again.');
            rl.close();
            process.exit(1);
        }

        // Create a new admin user
        // PUT /_config/admins/{username}
        // Request body: The new password, as a JSON string (e.g., "password").
        url = `_config/admins/${newAdmin}`;
        try {
            const response = await fetch(baseUrl + url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                body: `"${newPassword}"`
            });

            const res = await response.json();
            if (response.ok) {
                console.log(`Success: ${JSON.stringify(res)}\n`);
                console.log(`New admin ${newAdmin} created.\n`);
            } else {
                console.error(`Error: ${JSON.stringify(res)}\n`);
                rl.close();
                process.exit(1);
            }
        } catch (err) {
            console.error(`Fetch error: ${err.message}`);
            rl.close();
            process.exit(1);
        }
    }

    // Set the authentication handlers
    // PUT /_config/chttpd/authentication_handlers
    // Request body: The new value, as a JSON string 
    url = `_config/chttpd/authentication_handlers`;
    const authHandlers = '{chttpd_auth, jwt_authentication_handler}, {chttpd_auth, cookie_authentication_handler}, {chttpd_auth, default_authentication_handler}';
    try {
        const response = await fetch(baseUrl + url, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: `"${authHandlers}"`
        });

        const res = await response.json();
        if (response.ok) {
            console.log(`Success: ${JSON.stringify(res)}\n`);
            console.log(`Authentication_handlers updated.\n`);
        } else {
            console.error(`Error: ${JSON.stringify(res)}\n`);
            rl.close();
            process.exit(1);
        }
    } catch (err) {
        console.error(`Fetch error: ${err.message}`);
        rl.close();
        process.exit(1);
    }

    // Set jwt_auth
    // PUT /_config/jwt_auth/required_claims
    // Request body: The new value, as a JSON string 
    url = `_config/jwt_auth/required_claims`;
    const required_claims = 'exp';
    try {
        const response = await fetch(baseUrl + url, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: `"${required_claims}"`
        });

        const res = await response.json();
        if (response.ok) {
            console.log(`Success: ${JSON.stringify(res)}\n`);
            console.log(`JWT required claims updated.\n`);
        } else {
            console.error(`Error: ${JSON.stringify(res)}\n`);
            rl.close();
            process.exit(1);
        }
    } catch (err) {
        console.error(`Fetch error: ${err.message}`);
        rl.close();
        process.exit(1);
    }

    // Set the jwt_secret (encoded base64)
    // PUT /_config/jwt_keys/hmac:_default
    // Request body: The new value, as a JSON string 
    url = `_config/jwt_keys/hmac%3A_default`;
    const encoded = Buffer.from(jwt_secret, 'utf8').toString('base64');
    try {
        const response = await fetch(baseUrl + url, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: `"${encoded}"`
        });

        const res = await response.json();
        if (response.ok) {
            console.log(`Success: ${JSON.stringify(res)}\n`);
            console.log(`JWT secret updated.\n`);
        } else {
            console.error(`Error: ${JSON.stringify(res)}\n`);
            rl.close();
            process.exit(1);
        }
    } catch (err) {
        console.error(`Fetch error: ${err.message}`);
        rl.close();
        process.exit(1);
    }

    let db_exists = true;
    // Check if the database exists
    // GET /db_name
    // Request body: The new value, as a JSON string 
    url = `http://${host}/${db_name}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        const res = await response.json();
        if (response.ok) {
            console.log(`Database ${db_name} already exists.\n`);
        } else {
            if (response.status === 404) {
                console.log(`Database ${db_name} does not exist.\n`);
                db_exists = false;
            } else {
                console.error(`Error: ${JSON.stringify(res)}\n`);
                rl.close();
                process.exit(1);
            }
        }
    } catch (err) {
        console.error(`Fetch error: ${err}`);
        rl.close();
        process.exit(1);
    }

    if (!db_exists) {
        // Create the database
        // PUT /db_name
        // Request body: The new value, as a JSON string 
        url = `http://${host}/${db_name}`;
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            });

            const res = await response.json();
            if (response.status) {
                console.log(`Database ${db_name} created.\n`);
            } else {
                console.error(`Error: ${JSON.stringify(res)}\n`);
                rl.close();
                process.exit(1);
            }
        } catch (err) {
            console.error(`Fetch error: ${err.message}`);
            rl.close();
            process.exit(1);
        }
    }

    // Set the database permissions
    // PUT /db_name/_security
    // Request body: The new value, as a JSON string 
    const security = {
        admins: {
            names: [`${newAdmin}`],
            roles: ["_admin"]
        },
        members: {
            names: [],
            roles: ["_admin"]
        }
    };
    console.log(`Setting security for database ${JSON.stringify(security)}.\n`);
    url = `http://${host}/${db_name}/_security`;
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(security)
        });

        const res = await response.json();
        if (response.status) {
            console.log(`${newAdmin} added to database ${db_name}.\n`);
        } else {
            console.error(`Error: ${JSON.stringify(res)}\n`);
            rl.close();
            process.exit(1);
        }
    } catch (err) {
        console.error(`Fetch error: ${err.message}`);
        rl.close();
        process.exit(1);
    }

    rl.close();
})();
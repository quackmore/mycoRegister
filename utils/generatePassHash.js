import bcrypt from 'bcryptjs';
import { exit } from 'process';
const saltRounds = 10;

const args = process.argv.slice(2);

if (args[0]) {
  console.log(`your password: ${args[0]}`);
} else {
  console.log('Usage: nodejs generatePassHash.js <password>');
  exit(1);
}

const hash = await bcrypt.hash(args[0], saltRounds);
console.log(`your hash password: ${hash}`);

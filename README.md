# Usage guide

(This guide will not be fully comprehensive. You may need to debug and troubleshoot on your own. This is because of the important reason that I am too lazy.)

#### 0. Requirements

Google chrome, an IDE like VScode, NodeJS installed, a GitHub account, a working brain with some problem solving ability. This program was coded with and for windows, I have no idea if it works on other OS.

#### 1. Download the program files/clone the repo in your IDE.

#### 2. Download the necessary dependencies

In the terminal window, run

```bash
npm i
```

#### 3. Input your credentials into the 3 template files.

After inputting the necessary details into each template file, rename the file by removing the "Template" part.

##### a. configTemplate:

set FULL_AUTO to either true or false, set DESIRED_MONTHS to the months you want to book (keeping in mind the same formatting). Under the function GET_EARLIEST_SLOT, you need to specify what is the earliest time you would want to have a lesson. For example, if you set the date and time to today 12pm, the program will only book slots that take place from today 12pm onwards. Note that months in Javascript are zero-indexed.

API_KEY: This program uses NopeCha to automatically solve captchas. You can use their API for free by signing into NopeCha with your GitHub account, then generating a free GitHub key. Shamelessly, you need to star their github repo in order to be able to generate the key for free. The limited amount of credits should be more than enough since you can generate a new key every 24 hours. Do remember to regenerate the key when it expires.

##### b. notificationTemplate:

Because you will interrupt the program if you login to your bbdc account on another device, in order for you to check whether slots have been successfully booked, for instance if your computer is botting at home while you are out, "emails" can be sent using nodemailer and ethereal mail. You can change this implementation if you would like but for the ethereal mail implementation, simply create an ethereal mail account, save the login and password and input them into the "user" and "pass" properties in notificationTemplate.

##### c. passwordsTemplate:

Input your bbdc account id and password into this file.

#### 4. Running the program

In the terminal window, run:

```bash
node bbdc.js
```

Running:

```bash
node login.js
```

will just help you login without doing any slot booking.

# Further explanation of usage

As soon as you start the program, you don't need to touch your keyboard or mouse at all. If you want to, you can manually key in the captcha. In this case, you don't need to touch your mouse either; you literally only need to type in the captcha.

## Success Rate

Success rate of successfully booking a slot given that a slot is released is low. Depending on auto/manual, and the time of day, success rate chages, but in general you need a good internet connection, fast manual keying of the captcha, and some luck in order to successfully book a slot.

## Captcha Solving

This program comes with auto-captcha solving, although the auto solving is usually slower than manual solving. **For maximum speed, once 5 characters are input into the captcha field it is immediately submitted.** You can "race" with the program and manual solve it faster and there won't be any issues, but if it is auto solved when you are mid way it will add on the input to whatever you have which causes it to be wrong. (The selenium methods to clear out the input fields don't seem to work, you are welcome to try and fix this bug.) However, auto solving is almost never fast enough to get the slot before others, so I guess it just makes logging in more convenient and allows u to bot when ure not home.

## FULL_AUTO Mode

config(template).js: If FULL_AUTO is false vs true the only difference is that there will be notifications and music if it is set to false. In both cases, auto-solving of captcha is attempted and you are still able to manually put in the captcha.

# Customisation

Feel free to replace the "aimer.js" file to any other mp3 file of your liking. This is the audio that plays when a slot if found.

# Error messages

"auto solving of captcha failed: Out of credit" -> You need to generate a new NopeCha API key

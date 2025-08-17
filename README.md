# String Art Generator

## Description

This is a web-based application that generates string art from uploaded images. It allows users to convert any image into a beautiful string art pattern, providing controls for various parameters to customize the output.

It is inspired by: https://www.thevelop.nl/blog/2016-12-25/ThreadTone/

## Features

- **Image Upload:** Upload any image (PNG, JPG, etc.).
- **Image Processing:**
  - Automatic cropping to a square.
  - Conversion to grayscale.
  - Circular masking.
  - Adjustable contrast using a smooth sigmoid function.
- **ThreadTone Algorithm:** Implements a modified version of the "ThreadTone" algorithm for realistic string art generation.
- **Customizable Parameters:**
  - Number of Pins
  - Number of Lines
  - Line Width
  - Line Weight (intensity of thread)
  - Distance Bias (to favor longer, more structural lines)
- **Live Preview:** See the string art being generated in real-time during calculation.
- **Iteration Playback:** Scrub through the entire generation process, line by line, using a slider and navigation buttons.
- **Current Thread Info:** View the start and end pins for the currently displayed thread.
- **Toggle Background:** Show or hide the original image background.
- **Responsive Design:** Mobile-friendly and adapts to various screen sizes.
- **Minimalist UI:** Clean, dark-themed interface for a focused creative experience.

## How to Use Locally

1.  **Clone the repository:** (Assuming this will be in a git repo)
    ```bash
    git clone <repository-url>
    cd string_art
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the development server:**
    ```bash
    npm start
    ```
    This will open the application in your default web browser, with live reloading enabled.

## Deployment

This project is configured for easy deployment on [Vercel](https://vercel.com/).

1.  **Install Vercel CLI:**
    ```bash
    npm install -g vercel
    ```
2.  **Log in:**
    ```bash
    vercel login
    ```
3.  **Deploy from the project root:**
    ```bash
    vercel
    ```
    The `vercel.json` file in the root directory specifies the deployment configuration.

## Credits & Inspiration

The core string art generation algorithm is heavily inspired by the "ThreadTone" method described in this excellent blog post:
[Thevelop Blog - ThreadTone](https://www.thevelop.nl/blog/2016-12-25/ThreadTone/)

# AI Studio App

## Project Overview

The AI Studio App is a web application designed to facilitate interactive coding and problem-solving with the help of a Gemini-powered AI assistant. It allows users to chat with an AI, manage project files, view and edit code in an integrated editor, and receive real-time code updates based on the AI's suggestions. This provides a dynamic environment for development, learning, and experimentation.

## Features

*   **Interactive Chat:** Communicate directly with a Gemini-powered AI assistant to ask questions, request features, or debug code.
*   **File Explorer:** Easily navigate and manage your project files within the application.
*   **Integrated Monaco Code Editor:** View and edit your code with a feature-rich editor, complete with syntax highlighting and other standard IDE features.
*   **Real-time Code Updates:** See changes suggested by the AI instantly reflected in the editor and project files.
*   **Plan & Task Execution:** The AI can outline a plan for complex tasks and execute them step-by-step.
*   **Theme Toggle:** Switch between light and dark themes. The theme preference is saved locally.

## Getting Started / Installation

This section guides you through setting up and running the AI Studio App locally.

**Prerequisites:**

*   **Node.js:** Ensure you have a recent version of Node.js installed (which includes npm). You can download it from [nodejs.org](https://nodejs.org/).

**Setup Steps:**

1.  **Clone the Repository (if you haven't already):**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies:**
    Open your terminal in the project's root directory and run:
    ```bash
    npm install
    ```

3.  **Set up your Gemini API Key:**
    *   You need a Gemini API key to use the AI features. You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey) (or other relevant Google Cloud services).
    *   In the root directory of the project, ensure a file named `.env` exists. If it doesn't, create it. (The previous steps in this guide might have already created this file with a placeholder).
    *   Open the `.env` file and add or modify your API key in the following format:
        ```env
        VITE_GEMINI_API_KEY=your_actual_api_key_here
        ```
    *   **Important:** Replace `your_actual_api_key_here` with your actual Gemini API key. If the file was created with a placeholder, replace the placeholder value.

4.  **Run the Application:**
    After installing dependencies and setting up your API key, run the development server:
    ```bash
    npm run dev
    ```
    This will typically start the app on `http://localhost:3000` (or another port if specified). Open this URL in your web browser.

**Troubleshooting:**

*   **API Key Not Working / "Authentication Error":**
    *   Ensure the API key is copied exactly into the `.env` file under the `VITE_GEMINI_API_KEY` variable.
    *   Verify that the file is named precisely `.env` (note the leading dot).
    *   Confirm that the `.env` file is located in the root directory of the project (the same directory as `package.json`).
    *   Restart the development server (`npm run dev`) after creating or modifying the `.env` file and the API key.
    *   Check if your API key is active and has the necessary permissions in your Google Cloud project / AI Studio.

*   **"GenAI Client not initialized" / "Failed to initialize AI":**
    *   This often relates to the API key. Double-check all the points in "API Key Not Working."
    *   Ensure you have a stable internet connection.
    *   There might be temporary issues with the Gemini API service; you can check its status if problems persist.

## How to Use

Once the application is running:

1.  The interface will typically present a chat window, a file explorer, and a code editor.
2.  You can start by selecting a sample project (if available) or by loading your own project files (if supported).
3.  Type your development task, question, or problem you want to solve into the chat input area.
4.  The AI assistant will respond. This might include explanations, a step-by-step plan, or direct code suggestions.
5.  If the AI provides code, it may automatically update the relevant files, which you'll see reflected in the editor.
6.  Continue interacting with the AI to refine the solution, ask for alternatives, or move on to new tasks.

## Contributing

Contributions are welcome! If you'd like to contribute to the development of the AI Studio App:

1.  **Fork the repository** on GitHub.
2.  **Create a new branch** for your feature or bug fix.
3.  **Make your changes** and commit them with clear, descriptive messages.
4.  **Push your branch** to your forked repository.
5.  **Submit a pull request** to the main repository.

For major changes or new features, it's a good idea to open an issue first to discuss your proposed changes with the maintainers.

---

We hope you find the AI Studio App useful!

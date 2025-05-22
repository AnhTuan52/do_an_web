import React, { useState, useEffect, useRef } from "react";

function Chatbot() {
    const [messages, setMessages] = useState([
        { text: "Hello! How can I assist you today?", isUser: false, timestamp: new Date() }
    ]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const chatBodyRef = useRef(null);
    const inputRef = useRef(null);
    const API_KEY = import.meta.env.MODEL_API_KEY;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const handleInputChange = (e) => {
        setInput(e.target.value);
        const inputArea = inputRef.current;

        if(inputArea && input){
            inputArea.style.height = 'auto';
            inputArea.style.height = `${inputArea.scrollHeight}px`;
        }
    }

    const scrollToBottom = () => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTo({
                top: chatBodyRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (input.trim()) {
            const userMessage = { 
                text: input, 
                isUser: true, 
                timestamp: new Date() 
            };
            setMessages(prev => [...prev, userMessage]);
            setInput("");
            setIsThinking(true);

            if (inputRef.current) {
                inputRef.current.style.height = '45px';
            }

            const chatHistory = messages.slice(-10).map((msg) => ({
                role: msg.isUser ? "user" : "model",
                parts: [{ text: msg.text }]
            }));

            try {
                const requestOptions = {
                    method: "POST",
                    headers: { "Content-Type": "application/json"},
                    body: JSON.stringify({
                        contents: [
                            ...chatHistory,
                            { role: "user", parts: [{ text: input }] }
                        ]
                    })
                };
                const response = await fetch(API_URL, requestOptions);
                const data = await response.json();
                const botResponse = {
                    text: data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't understand that.",
                    isUser: false,
                    timestamp: new Date()
                };
                
                setMessages(prev => [...prev, botResponse]);
            } catch (error) {
                console.error('Error:', error);
                setMessages(prev => [...prev, { 
                    text: "Sorry, I encountered an error!", 
                    isUser: false, 
                    timestamp: new Date() 
                }]);
            } finally {
                setIsThinking(false);
            }
        }
    };

    return (
        <>  
           <div className="chatbot-container relative flex flex-col h-[85vh] w-full max-w-full mx-auto ml-0 mr-0 mt-0 bg-white dark:bg-dark4 overflow-y-hidden ">
                <div className="chat-header flex p-2.5 px-1.5 pl-0 bg-gray-50 dark:bg-dark4 w-full h-[60px] top-0 sticky z-10 items-center md:h-[60px] h-[50px] md:p-2.5 md:px-1.5 p-2">
                    <h2 className="m-0 mt-2.5 ml-5 text-[30px] text-blue-300">AI Assistant</h2>
                </div>
                <div className="chat-body flex-1 flex flex-col p-4 px-5 overflow-y-auto bg-white dark:bg-dark4 md:p-4 md:px-5 p-3 dark:scrollbar-track-gray-800 scrollbar-custom" ref={chatBodyRef}>
                    {messages.map((msg, index) => (
                        <div 
                            key={index} 
                            className={`message flex mb-3.5 max-w-[75%] break-words ${msg.isUser ? 'justify-end self-end' : 'justify-start'}`}
                        >
                            <div className={`message-text whitespace-pre-wrap ${msg.isUser ? 'bg-blue-600 text-white rounded-[20px] p-2.5 px-3.5' : 'bg-gray-200 rounded-[20px] p-2.5 px-3.5 text-gray-800'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="message bot-message flex mb-3.5 max-w-[75%] break-words justify-start">
                            <div className="message-text bg-gray-200 rounded-[20px] p-2.5 px-3.5 text-gray-800">
                                <div className="thinking-indicator flex m-0 gap-1.5 py-2 pb-1">
                                    <div className="dot h-2 w-2 opacity-70 rounded-full bg-blue-600"></div>
                                    <div className="dot h-2 w-2 opacity-70 rounded-full bg-blue-600"></div>
                                    <div className="dot h-2 w-2 opacity-70 rounded-full bg-blue-600"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="chat-footer p-2.5 px-5 bg-white dark:bg-dark4 sticky bottom-0 w-full z-10 md:p-2.5 md:px-5 p-2">
                    <form onSubmit={handleSubmit} className="chat-form dark:bg-dark5 flex items-center rounded-[20px] outline outline-1 outline-[#CCCCE5] gap-2.5 w-full focus-within:outline-2 focus-within:outline-blue-600 focus-within:border-blue-700 dark:focus-within:outline-blue-400 dark:focus-within:border-blue-500">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Type your message..."
                            className="message-input dark:text-gray-100 flex-1 p-2.5 rounded-[inherit] border-none outline-none resize-none text-base leading-6 min-h-[45px] max-h-[100px] overflow-y-auto pl-3.5 dark:bg-dark5 md:min-h-[45px] min-h-[40px]"
                            rows="1"
                        />
                        {!isThinking && (
                            <button 
                                type="submit" 
                                className={`send-button border-none rounded-full cursor-pointer bg-[#5350C4] mr-2.5 transition-all duration-300 hover:bg-[#3d39ac] md:w-10 md:h-10 w-9 h-9 ${input.trim() ? 'block' : 'hidden'}`} 
                                id="buttonnn"
                            >
                                <i className='bx bx-up-arrow-alt icon w-full text-white'></i>
                            </button>
                        )}
                    </form>
                </div>
            </div> 
        </>
    );
}

export default Chatbot;
"use client";
import { useEffect, useState } from "react";
import { Character } from "@/types";
import { characters, getCharacterById } from "@/lib/characters";
import CharacterCard from "@/components/CharacterCard";
import ChatPage from "@/components/ChatPage";
import UserAuthStatus from "@/components/UserAuthStatus";
import { useChatStore } from "@/store/chatStore";

const SELECTED_CHARACTER_STORAGE_KEY = "selected_character_id";

export default function Home() {
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(() => {
        if (typeof window === "undefined") return null;

        const savedCharacterId = window.localStorage.getItem(SELECTED_CHARACTER_STORAGE_KEY);
        return savedCharacterId ? getCharacterById(savedCharacterId) || null : null;
    });
    const { currentCharacter, setCurrentCharacter } = useChatStore();

    useEffect(() => {
        if (selectedCharacter) return;

        const savedCharacterId = window.localStorage.getItem(SELECTED_CHARACTER_STORAGE_KEY);
        const savedCharacter = savedCharacterId ? getCharacterById(savedCharacterId) : null;
        const characterToRestore = savedCharacter || currentCharacter;

        if (characterToRestore) {
            setSelectedCharacter(characterToRestore);
            setCurrentCharacter(characterToRestore);
        }
    }, [currentCharacter, selectedCharacter, setCurrentCharacter]);

    const handleSelectCharacter = (character: Character) => {
        setSelectedCharacter(character);
        setCurrentCharacter(character);
        window.localStorage.setItem(SELECTED_CHARACTER_STORAGE_KEY, character.id);
    };

    const handleBackToHome = () => {
        setSelectedCharacter(null);
        setCurrentCharacter(null);
        window.localStorage.removeItem(SELECTED_CHARACTER_STORAGE_KEY);
    };

    if (selectedCharacter) {
        return <ChatPage character={selectedCharacter} onBack={handleBackToHome} />;
    }

    return (
        <div
            className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50">
            <div className="fixed right-4 top-4 z-40 rounded-full bg-white/80 px-3 py-2 shadow-sm backdrop-blur-sm">
                <UserAuthStatus />
            </div>
            {}
            <div className="pt-12 pb-8 text-center">
                <h1
                    className="text-3xl font-bold text-gray-800 mb-2"
                    style={{
                        fontFamily: "\"Noto Sans SC\", sans-serif",
                        fontWeight: "bold",
                        fontStyle: "italic",
                        textDecorationThickness: "0px",
                        WebkitTextStrokeColor: "#0A0A0A",
                        color: "#0A0A0A",
                        backgroundColor: "transparent"
                    }}>纸片人男友
                            </h1>
                <p className="text-gray-500 text-sm">选择一个专属男友，开启你的甜蜜陪伴
                            </p>
            </div>
            {}
            <div className="max-w-4xl mx-auto px-4 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {characters.map(character => <CharacterCard
                        key={character.id}
                        character={character}
                        onSelect={() => handleSelectCharacter(character)} />)}
                </div>
            </div>
            {}
            <div
                className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 py-3 text-center">
                <p className="text-xs text-gray-400">选择一位男友，开始你们的专属故事
                            </p>
            </div>
        </div>
    );
}

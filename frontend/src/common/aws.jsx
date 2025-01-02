import axios from "axios";

export const uploadImage = async (img) => {
    let imageUrl = null;

    try {
        const { data: { uploadURL } } = await axios.get(`${import.meta.env.VITE_SERVER_DOMAIN}/get-upload-url`);

        await axios.put(uploadURL, img, {
            headers: { 'Content-Type': img.type }, // Use the correct content type
        });
        
        imageUrl = uploadURL.split("?")[0];
    } catch (error) {
        console.error("Error uploading image:", error);
    }

    return imageUrl;
};

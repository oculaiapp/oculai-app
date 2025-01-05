import streamlit as st
import torch
from torchvision import transforms, models
from PIL import Image
import requests
import io
import numpy as np

st.set_page_config(
    page_title="OculAI",
    page_icon="👁️",
    layout="wide",
    initial_sidebar_state="auto",
)

@st.cache_resource
def load_model():
    try:
        url = "https://huggingface.co/oculotest/smart-scanner-model/resolve/main/found_eyegvd_92.pth"
        response = requests.get(url)
        response.raise_for_status()

        # Use EfficientNet as per the PDF
        model = models.efficientnet_b0(pretrained=True)
        num_features = model.classifier[1].in_features
        model.classifier[1] = torch.nn.Linear(num_features, 4)  # 4 classes for the new categories

        # Load state dictionary
        state_dict = torch.load(io.BytesIO(response.content), map_location=torch.device("cpu"))
        model.load_state_dict(state_dict, strict=False)

        model.eval()
        return model

    except Exception as e:
        st.error(f"Error loading the model: {e}")
        raise e

model = load_model()

def preprocess_image(image):
    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return transform(image).unsqueeze(0)

def predict(image):
    with torch.no_grad():
        outputs = model(image)
        probabilities = torch.nn.functional.softmax(outputs, dim=1).squeeze().tolist()
        return probabilities

st.title("OculAI")
st.subheader("One Model, Countless Diseases")

input_method = st.radio("Choose Input Method", ("Upload Image", "Capture from Camera"))

img = None

if input_method == "Upload Image":
    uploaded_file = st.file_uploader("Upload Eye Image", type=["jpg", "png", "jpeg"])
    if uploaded_file:
        img = Image.open(uploaded_file).convert("RGB")
elif input_method == "Capture from Camera":
    camera_image = st.camera_input("Capture Eye Image")
    if camera_image:
        img = Image.open(camera_image).convert("RGB")

if img:
    with st.spinner("Analyzing..."):
        st.image(img, caption="Selected Image", use_column_width=True)

        input_tensor = preprocess_image(img)
        
        try:
            probabilities = predict(input_tensor)

            categories = ["Normal", "Cataracts", "Diabetic Retinopathy", "Glaucoma"]
            prediction = categories[np.argmax(probabilities)]

            st.markdown(f"<h3>Predicted Category: {prediction}</h3>", unsafe_allow_html=True)
            
            st.markdown("<h3>Probabilities:</h3>", unsafe_allow_html=True)
            
            # Define colors for each category
            colors = {
                "Normal": "#00ff00",
                "Cataracts": "#ffff00",
                "Diabetic Retinopathy": "#ff0000",
                "Glaucoma": "#0000ff"
            }
            
            for category, prob in zip(categories, probabilities):
                st.write(f"<h4 style='font-size: 22px;'><strong>{category}:</strong> {prob * 100:.2f}%</h4>", unsafe_allow_html=True)
                
                # Custom progress bar with color styling
                progress_html = f"""
                <div style="background-color: #e0e0e0; border-radius: 25px; width: 100%; height: 18px; margin-bottom: 10px;">
                    <div style="background-color: {colors[category]}; width: {prob * 100}%; height: 100%; border-radius: 25px;"></div>
                </div>
                """
                st.markdown(progress_html, unsafe_allow_html=True)

        except Exception as e:
            st.error(f"Error during prediction: {e}")
else:
    st.info("Please upload or capture an eye image to proceed.")

import streamlit as st
import torch
from torchvision import transforms
from efficientnet_pytorch import EfficientNet
from PIL import Image
import requests
import io
import numpy as np

# Custom CSS for styling
st.markdown(
    """
    <style>
        html body { background-color: #0e1117; color: white; font-family: 'DM Sans', sans-serif; }
        div h1, div h2 { text-align: center; color: #32CD32; }
        div.stButton > button { background-color: #32CD32; color: white; border-radius: 10px; }
        div.stProgress > div > div { background-image: linear-gradient(90deg, #32CD32, #228B22); }
    </style>
    """,
    unsafe_allow_html=True,
)

# Load the model with caching to avoid reloading every time
@st.cache_resource
def load_model():
    try:
        url = "https://huggingface.co/oculotest/smart-scanner-model/resolve/main/ss_model.pth"
        response = requests.get(url)
        response.raise_for_status()

        # Load EfficientNetB0 and modify the final layer for 5 classes
        model = EfficientNet.from_name('efficientnet-b0')
        model._fc = torch.nn.Linear(model._fc.in_features, 5)  # Adjust for 5 classes

        state_dict = torch.load(io.BytesIO(response.content), map_location=torch.device("cpu"))
        model.load_state_dict(state_dict)
        model.eval()
        return model

    except Exception as e:
        st.error(f"Error loading the model: {e}")
        raise e

# Load the model once
model = load_model()

# Preprocessing function for input images
def preprocess_image(image):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return transform(image).unsqueeze(0)

# Prediction function
def predict(image):
    with torch.no_grad():
        outputs = model(image)
        probabilities = torch.nn.functional.softmax(outputs, dim=1).squeeze().tolist()
        return probabilities

# Streamlit app layout and functionality
st.title("Enhanced SMART Scanner")
st.subheader("Accurate Diabetic Retinopathy Detection")

# Input method selection
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

        # Preprocess the image and make predictions
        input_tensor = preprocess_image(img)
        
        try:
            probabilities = predict(input_tensor)

            # Define stages of diabetic retinopathy
            stages = ["No DR (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Proliferative DR (4)"]
            prediction = stages[np.argmax(probabilities)]

            # Display prediction results
            st.markdown(f"<h3>Predicted Stage: {prediction}</h3>", unsafe_allow_html=True)
            
            st.markdown("<h3>Probabilities:</h3>", unsafe_allow_html=True)
            
            for stage, prob in zip(stages, probabilities):
                st.write(f"{stage}: {prob * 100:.2f}%")
                st.progress(prob)

        except Exception as e:
            st.error(f"Error during prediction: {e}")
else:
    st.info("Please upload or capture an eye image to proceed.")

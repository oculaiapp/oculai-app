import streamlit as st
import torch
from torchvision import transforms
from PIL import Image
import requests
import io

# Load the model from Hugging Face
@st.cache_resource
def load_model():
    # Download the model file from Hugging Face
    url = "https://huggingface.co/oculotest/smart-scanner-model/resolve/main/ss_model.pth"
    response = requests.get(url)
    response.raise_for_status()  # Ensure the request was successful

    # Load the model from the downloaded state_dict
    model_state = torch.load(io.BytesIO(response.content), map_location=torch.device("cpu"))
    model = torch.nn.Sequential()  # Replace with your actual model architecture if needed
    model.load_state_dict(model_state)
    model.eval()
    return model

model = load_model()

# Define preprocessing transformations
def preprocess_image(image):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),  # Adjust size based on your model's input
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

# Streamlit UI Design
st.markdown(
    """
    <style>
        .main {
            background-color: #0e1117;
            color: white;
        }
        h1, h2, h3 {
            text-align: center;
            color: #32CD32;
        }
        .stButton>button {
            background-color: #32CD32;
            color: white;
            border-radius: 10px;
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            margin: 5px;
        }
        .stButton>button:hover {
            background-color: #228B22;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("SMART Scanner")
st.subheader("One Model, Countless Diseases")

# Image upload or capture options with UI buttons
uploaded_file = st.file_uploader("Upload Eye Image", type=["jpg", "png", "jpeg"])
camera_image = st.camera_input("Capture Eye Image")

if uploaded_file or camera_image:
    # Load and display the image
    img = Image.open(uploaded_file if uploaded_file else camera_image)
    st.image(img, caption="Uploaded Image", use_column_width=True)

    # Preprocess and predict
    input_tensor = preprocess_image(img)
    probabilities = predict(input_tensor)

    # Map stages to labels
    stages = ["No DR (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Proliferative DR (4)"]
    prediction = stages[probabilities.index(max(probabilities))]

    # Display results in a styled format
    st.markdown(f"<h3>Predicted Stage: {prediction}</h3>", unsafe_allow_html=True)
    
    st.markdown("<h3>Probabilities:</h3>", unsafe_allow_html=True)
    for stage, prob in zip(stages, probabilities):
        st.write(f"{stage}: {prob * 100:.2f}%")
else:
    st.info("Please upload or capture an eye image to proceed.")

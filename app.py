import streamlit as st
import torch
from torchvision import transforms, models
from PIL import Image
import requests
import io

st.markdown(
    """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap');

        html body {
            background-color: #0e1117 !important;
            color: white !important;
            font-family: 'DM Sans', sans-serif !important;
            margin: 0;
            padding: 0;
        }

        div h1, div h2, div h3 {
            text-align: center !important;
            color: #32CD32 !important;
            animation: fadeIn 2s ease-in-out !important;
        }

        div.stButton > button {
            background-color: #32CD32 !important;
            color: white !important;
            border-radius: 10px !important;
            border: none !important;
            padding: 10px 20px !important;
            font-size: 16px !important;
            margin: 5px !important;
            transition: all 0.3s ease-in-out !important;
            box-shadow: 0px 4px 6px rgba(50, 205, 50, 0.4) !important;
        }
        div.stButton > button:hover {
            background-color: #228B22 !important;
            transform: scale(1.05) !important;
            box-shadow: 0px 6px 8px rgba(34, 139, 34, 0.6) !important;
        }

        div.stProgress > div > div {
            background-image: linear-gradient(90deg, #32CD32, #228B22) !important;
        }

        div[data-baseweb="radio"] > div {
            background-color: #1a1d23 !important;
            border-radius: 10px !important;
            padding: 10px !important;
            margin-bottom: 10px !important;
        }
        div[data-baseweb="radio"] > div:hover {
            background-color: #242830 !important;
        }

        .stFileUploader {
            border-radius: 10px !important;
            background-color: #1a1d23 !important;
            color: white !important;
        }

        .stCameraInput {
            border-radius: 10px !important;
            background-color: #1a1d23 !important;
        }

        .stSpinner > div {
            border-top-color: #32CD32 !important; 
        }

        img {
            border-radius: 15px !important;
            box-shadow: 0px 4px 8px rgba(0,0,0,0.6) !important;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    </style>
    """,
    unsafe_allow_html=True,
)

@st.cache_resource
def load_model():
    try:
        url = "https://huggingface.co/oculotest/smart-scanner-model/resolve/main/ss_model.pth"
        response = requests.get(url)
        response.raise_for_status()  # Ensure download was successful

        model = models.resnet18(pretrained=True)
        model.fc = torch.nn.Linear(model.fc.in_features, 5)

        state_dict = torch.load(io.BytesIO(response.content), map_location=torch.device("cpu"))
        
        new_state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()} 
        model.load_state_dict(new_state_dict, strict=False)

        model.eval()
        return model

    except Exception as e:
        st.error(f"Error loading the model: {e}")
        raise e

model = load_model()

def preprocess_image(image):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return transform(image).unsqueeze(0)

def predict(image):
    with torch.no_grad():
        outputs = model(image)
        probabilities = torch.nn.functional.softmax(outputs, dim=1).squeeze().tolist()
        return probabilities

st.title("SMART Scanner")
st.subheader("One Model, Countless Diseases")

input_method = st.radio("Choose Input Method", ("Upload Image", "Capture from Camera"))

img = None

if input_method == "Upload Image":
    uploaded_file = st.file_uploader("Upload Eye Image", type=["jpg", "png", "jpeg"])
    if uploaded_file:
        img = Image.open(uploaded_file)
elif input_method == "Capture from Camera":
    camera_image = st.camera_input("Capture Eye Image")
    if camera_image:
        img = Image.open(camera_image)

if img:
    with st.spinner("Analyzing..."):
        st.image(img, caption="Selected Image", use_column_width=True)

        input_tensor = preprocess_image(img)
        
        try:
            probabilities = predict(input_tensor)

            stages = ["No DR (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Proliferative DR (4)"]
            prediction = stages[probabilities.index(max(probabilities))]

            st.markdown(f"<h3>Predicted Stage: {prediction}</h3>", unsafe_allow_html=True)
            
            st.markdown("<h3>Probabilities:</h3>", unsafe_allow_html=True)
            
            for stage, prob in zip(stages, probabilities):
                st.write(f"{stage}: {prob * 100:.2f}%")
                st.progress(prob)

        except Exception as e:
            st.error(f"Error during prediction: {e}")
else:
    st.info("Please upload or capture an eye image to proceed.")

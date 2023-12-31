import { useRef, useState, useEffect } from "react";
import {ExampleDatapoints} from "../../components/Example"
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import { QuestionInput } from "../../components/QuestionInput";
import { ClearChatButton } from "../../components/ClearChatButton";
import { UserChatMessage } from "../../components/UserChatMessage";
import { Answer } from "../../components/Answer";
import { AskQuestion } from "../../api";
import { Modal } from "antd";
import {NoUploadConfig} from "../../Utils/Utils"
import type {AskRequest,AskResponse, citation} from "../../api/apiTypes";
import styles from "./Chat.module.css";
import { AnalysisPanel } from "../../components/AnalysisPanel/AnalysisPanel";


const Chat = () => {

    //for example Datapoints
    const [selectedDatapoints, setSelectedDatapoints] = useState<CheckboxValueType[]>([])
    const [path, setPath] = useState<string|null>(null)
    const [selectedFile, setSelectedFile] = useState<File[]|null>();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const lastQuestionRef = useRef<string>("");
    const [error, setError] = useState<unknown>();
    const [questionAnswers, setQuestionAnswers] = useState<[question:string, response: AskResponse][]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<number>(0);
    const [citationTab, setCitationTab] = useState<boolean>(false);
    const [citationValue, setCitationValue] = useState<string|null>(null)
    const [modal, contextHolder] = Modal.useModal();
    const [selectedCitation, setSelectedCitation] = useState<number|null>(null);


    //for example Datapoints
    const onSelectedDatapoints=(value:CheckboxValueType[])=>
    {
        setSelectedDatapoints(value)
    }

    const onSelectedPath=(value:string|null)=>
    {
        setPath(value)
    }


    const clearChat = () => {
        lastQuestionRef.current = "";
        error && setError(undefined);
        setQuestionAnswers([]);
    };

    const onShowCitation = (answerIndex:number,citationLink:string, citationIndex: number)=>
    {

        if( citationTab && selectedAnswer === answerIndex && selectedCitation === citationIndex)
            {
                setCitationTab(false)
            }
            else{
                setCitationTab(true)
            }
            setSelectedAnswer(answerIndex);
            setCitationValue(citationLink)
            setSelectedCitation(citationIndex);


            // same answer, different citation => switch
            // different answer, different citation => switch
            // same answer, same citation => close

    }

    const makeApiRequest = async (question: string, isDatapoint =false) => {

        if(!selectedFile)
        {
            modal.warning(NoUploadConfig)
            // TO make sure questions cant be asked without attaching a document first
            return
        }

        lastQuestionRef.current = question;
        error && setError(undefined);
        setIsLoading(true);

        try {

            //TODO: if it is datapoint (i.e. selected through checkbox), send individual question for each datapoint
            if(isDatapoint)
            {
                let questionList = question.split(",")
                try{
                const promiseList = questionList.map(async (datapoint)=> {
                    let request:AskRequest = {prompt: datapoint, isDatapoint: isDatapoint}
                    return AskQuestion(request)
                })
                let responses = await Promise.all(promiseList)
                if(responses && responses.length >=1)
                {
                    responses.forEach((response,indx)=>
                    {
                        let transformedResponse:AskResponse ={answer:response.answer, questionId: response.questionId,citationLinks: response.citations?.split(',')??""}
                        setQuestionAnswers(prevAnswers => [...prevAnswers, [questionList[indx], transformedResponse]])
                    })
                }
            }
            catch(e)
            {
                throw e
            }
            }
            else
            {
            let request : AskRequest = {prompt: question, isDatapoint: isDatapoint}
            let response = await AskQuestion(request)
            //TODO: Currently, predefined questionID, change to backend generated questionId later
            let transformedResponse:AskResponse ={ answer:response.answer, questionId: response.questionId }
            if(response)
            {
                setQuestionAnswers([...questionAnswers, [question, transformedResponse]])
            }
        }


        } catch (e) {
            setError(e);
        } finally {
            setIsLoading(false);
        }
    };


    return (

        <div className={styles.container}>
            {contextHolder}
            <div className={styles.commandsContainer}>
            <ClearChatButton className={styles.commandButton} onClick={clearChat} disabled={!lastQuestionRef.current || isLoading} />
            </div>
        <div className={styles.chatRoot}>
            <div className={styles.chatContainer}>
                    {lastQuestionRef.current?
                     (<div className={styles.chatMessageStream}>
                     {
                     questionAnswers.map((answer, index) => (
                         <div key={index}>
                             <UserChatMessage message={answer[0]} />
                             <div className={styles.chatMessageGpt}>
                                 <Answer
                                     key={index}
                                     answer={answer[1]}
                                     isSelected = {selectedAnswer === index && citationTab}
                                     answerIndex = {index}
                                     onShowCitation={onShowCitation}
                                 />
                             </div>
                         </div>
                     ))}
                     </div>)
                    :(
                        <div className={styles.chatEmptyState}>
                        <h2 className={styles.chatEmptyStateTitle}>Chat with your data</h2>
                        <h3 className={styles.chatEmptyStateSubtitle}>Enter prompt or choose from options below</h3>
                        <br/>
                          <ExampleDatapoints onSend={question => makeApiRequest(question, true)} selectedDatapoints= {selectedDatapoints} onSelectedDatapoints = {onSelectedDatapoints} path={path} onSelectedPath = {onSelectedPath}/>
                    </div>)
                    }

                <div className={styles.chatInput}>
                    <QuestionInput
                        clearOnSend
                        placeholder="Type a question"
                        disabled={isLoading}
                        onSend={question => makeApiRequest(question)}
                        selectedFile={selectedFile}
                        setSelectedFile={setSelectedFile}
                        selectedDatapoints={selectedDatapoints}
                    />
                </div>
            </div>
            {questionAnswers.length > 0 && citationTab && (
                    <AnalysisPanel
                        citationTab = {citationTab}
                        citationValue = {citationValue}
                    />
                )}
        </div>
    </div>
    );
};

export default Chat;


